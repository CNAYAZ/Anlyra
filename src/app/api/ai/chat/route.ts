import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { DEMO_ORG_ID, getAuthContext, getSessionState, hasDemoSession } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireEditorRole } from '@/lib/auth/require-role';
import { checkRateLimit, getClientIp, returnQuota, takeQuota } from '@/lib/rate-limit';
import {
  DEMO_CHAT_COOKIE,
  DEMO_CHAT_COOKIE_MAX_AGE,
  demoDayKey,
  demoIpKey,
  demoMonthKey,
  readDemoChatSessionId,
} from '@/lib/demo/chat-quota';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import { prisma } from '@/lib/prisma';
import { requireActiveAccess } from '@/lib/billing/server-gate';
import {
  consumeCredits,
  refundCredits,
  settleAiCredits,
  InsufficientCreditsError,
  type CreditSpend,
} from '@/lib/credits';
import { AI_OPERATIONS, chargeFor, maxCreditsFor, type AiUsage } from '@/lib/ai/credit-cost';
import {
  AI_UNAVAILABLE,
  AI_UNAVAILABLE_STATUS,
  isAnthropicSpendLimitError,
  logAnthropicSpendLimit,
} from '@/lib/ai/spend-limit';
import {
  chatComplete,
  isAnthropicConfigured,
  MISSING_KEY_MESSAGE,
} from '@/lib/ai/client';
import { buildSystemPrompt, loadBusinessContext } from '@/lib/ai-context';
import { modelFor } from '@/lib/ai/models';
import { DEMO_FREE_QUESTIONS, DEMO_SUGGESTED_QUESTIONS } from '@/lib/demo/chat-mode';
import {
  DemoCacheUnavailableError,
  demoAnswerKey,
  demoDataFingerprint,
  getOrCreateDemoAnswer,
} from '@/lib/demo/answer-cache';
import { ensureDemoDataCurrent } from '@/lib/demo/rolling-data';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

/**
 * How many of the conversation's most recent messages are resent to the model.
 *
 * ── WHY A CAP EXISTS AT ALL ──
 * Every turn used to resend the ENTIRE thread (findMany with no take). The
 * credit is charged BEFORE the model call and deliberately not refunded on
 * failure (see credits.ts), which is fine for an occasional outage — but once a
 * thread outgrows the model's context window the failure is PERMANENT and
 * repeats on every retry: each attempt costs a credit and none can ever
 * succeed, and the conversation can never be used again. That is the trap this
 * cap removes.
 *
 * ── WHY 40 ──
 * Measured against what this route actually sends. The system prompt is bounded
 * (3 months of financials, at most 8 facts, at most 10 receivables, at most 10
 * recurring expenses, plus a static tone block) at roughly 2,000 tokens. A user
 * message is capped at 4,000 characters by SendSchema (~1,100 tokens) and a
 * reply at ANTHROPIC_MAX_TOKENS (16,000; the model's thinking is not stored, so
 * a saved reply is at most that) — so an absolute worst-case exchange is
 * ~17,100 tokens. 40 messages is 20 exchanges: ~342k tokens worst case, plus the
 * system prompt and room for the reply, still inside the 1M window of the
 * configured model. A realistic exchange (a
 * short question, a ~900-token answer) is ~1,000 tokens, so an ordinary
 * conversation never reaches this cap at all — only the rare very long thread
 * does, and for that one the alternative was a dead conversation.
 *
 * The older messages are NOT deleted: they stay in the conversation, are still
 * shown to the user and still returned by the conversation endpoints. They are
 * only left out of the REQUEST to the model.
 */
const CHAT_HISTORY_WINDOW = 40;

const SendSchema = z.object({
  conversationId: z.string().nullable().optional(),
  message: z.string().min(1).max(4000),
});

type DbMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
};

type DbConversation = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: DbMessage[];
};

function toMessageDTO(m: DbMessage) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

/**
 * True only for "the request was larger than the model's context window".
 *
 * Anthropic answers that with HTTP 400 / invalid_request_error and a message of
 * the form "prompt is too long: N tokens > 200000 maximum", which the SDK throws
 * as BadRequestError (verified against the installed SDK's error shape). Both
 * the status AND the wording are checked: a 400 from this route could in
 * principle mean something else, and refunding the wrong failure would hand back
 * credits for calls Anthropic did charge us for.
 *
 * This is the ONLY failure this route treats as refundable, and it is the one
 * failure that is permanent rather than transient — every other error keeps the
 * pre-existing no-refund behaviour that chat and analyze have always had.
 */
function isContextWindowError(err: unknown): boolean {
  if (!(err instanceof Anthropic.BadRequestError)) return false;
  return /prompt is too long/i.test(err.message);
}

function toConversationDTO(c: DbConversation) {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    messages: c.messages.map(toMessageDTO),
  };
}

export async function POST(req: NextRequest) {
  if (!isAnthropicConfigured()) {
    return fail(MISSING_KEY_MESSAGE, 503);
  }

  const ctx = await getAuthContext();
  if (!ctx) {
    // The visitor who pressed "try the demo" (no account): the demo chat below.
    if ((await getSessionState()).status === 'anonymous' && (await hasDemoSession())) {
      return demoRequest(req);
    }
    return fail('Unauthorized', 401);
  }
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;
  // Viewer: read-only role — see requireEditorRole.
  const viewerOnly = requireEditorRole(ctx);
  if (viewerOnly) return viewerOnly;
  const { userId, organizationId } = ctx;

  // Trial/subscription gate: an expired trial (or past_due) is read-only and may
  // not run the AI. Blocked BEFORE the rate limit and any AI call, so no credits
  // are spent. active/trialing pass straight through, unchanged.
  // Same gate, same order and same 402 as /api/ai/analyze: the chat is an AI
  // call like the others and was the only one missing it.
  const access = await requireActiveAccess(organizationId);
  if (!access.allowed) return fail('TRIAL_EXPIRED', 402);

  // Rate limit per IP+org — AI calls are expensive, so guard against abuse.
  // FAIL-CLOSED (see the 'ai-analyze' bucket): if the limiter cannot be reached
  // the request is refused rather than allowed to bill Anthropic unmetered.
  // Deliberately the SAME bucket as the other three AI surfaces: a chat turn
  // costs us exactly what an analysis costs, so it shares the same 20/10min
  // budget instead of getting a separate one that would double the ceiling.
  const rl = await checkRateLimit('ai-analyze', `${getClientIp(req)}:org:${organizationId}`);
  if (!rl.success) return rateLimitResponse(rl);

  const json = await req.json().catch(() => null);
  const parsed = SendSchema.safeParse(json);
  if (!parsed.success) return fail('INVALID_INPUT', 400);

  const { conversationId, message } = parsed.data;

  // RESERVES THE MAXIMUM a message can cost (maxCreditsFor), in the same
  // single atomic statement as before, so two simultaneous messages can never
  // spend more than the balance holds. Fewer credits than the maximum → 402,
  // before anything is saved or sent (founder's decision). Once the answer is
  // back, settleAiCredits keeps its real cost and gives the rest back.
  //
  // `remaining` is the SUM of the plan and purchased balances — the single
  // number the user sees. Which column the credit came out of is decided inside
  // consumeCredits (plan first) and is not this route's business.
  //
  // The whole CreditSpend is kept, not just `remaining`: the unused part and the
  // one fully refundable failure below (a thread past the context window) have
  // to go back to the column they came out of.
  let spend: CreditSpend;
  try {
    spend = await consumeCredits(organizationId, maxCreditsFor('chat'));
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return fail('INSUFFICIENT_CREDITS', 402);
    }
    throw err;
  }

  // A model failure costs 1 credit, as it did when every message cost 1
  // (founder's decision): the rest of the reservation goes back. Also used if
  // the database fails before the model is even called.
  const keepOneCredit = async () => {
    try {
      await settleAiCredits(organizationId, spend, 1, null);
    } catch (settleErr) {
      console.error('[ai/chat] credit settlement FAILED after an error:', settleErr);
    }
  };

  let conversation;
  let systemPrompt: string;
  let priorMessages;
  try {
    conversation = conversationId
      ? await prisma.aIConversation.findFirst({
          where: { id: conversationId, organizationId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null;

    if (!conversation) {
      const title = message.slice(0, 60).trim() + (message.length > 60 ? '…' : '');
      conversation = await prisma.aIConversation.create({
        data: { organizationId, userId, title },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    await prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: 'USER', content: message },
    });

    const businessCtx = await loadBusinessContext(organizationId);
    systemPrompt = buildSystemPrompt(businessCtx, 'IT');

    // The LAST CHAT_HISTORY_WINDOW messages, still in chronological order:
    // Prisma's negative `take` counts from the end of the ordered result, so the
    // model receives the most recent part of the thread, oldest-to-newest, which
    // is the order it needs. Older messages stay in the database untouched.
    priorMessages = await prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: -CHAT_HISTORY_WINDOW,
    });
  } catch (err) {
    await keepOneCredit();
    throw err;
  }

  let assistantText = '';
  let tokensIn: number | undefined;
  let tokensOut: number | undefined;
  let stopReason: string | null = null;
  let usedModel = '';
  let usage: AiUsage | null = null;

  try {
    const result = await chatComplete(
      systemPrompt,
      priorMessages.map((m) => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content,
      })),
      {
        // System prompt: the org's business-context JSON (financials, facts,
        // scadenzario, spese ricorrenti) — identical for this org across ALL
        // of its conversations on the same calendar day (see the prompt
        // caching report on why: daysOverdueOf truncates to whole days, so
        // nothing inside it changes call to call absent new underlying data).
        // Reused across conversations, not just within one.
        cacheSystemPrompt: true,
        // Conversation history: every message resends the most recent
        // CHAT_HISTORY_WINDOW messages (it used to be the whole thread — see
        // that constant). Marking the last one lets each new turn build on
        // what the previous turn already cached, instead of reprocessing that
        // history at full price on every single message. The cap does not
        // weaken the caching: the window is a suffix of the thread, so
        // consecutive turns still share the same long common prefix until the
        // window starts sliding.
        cacheLastMessage: true,
        logLabel: 'chat',
        // Full business context + open-ended question: stays on the default
        // model (see @/lib/ai/models).
        surface: 'chat',
        // The ceiling the maximum above is priced on (founder's decision).
        maxTokens: AI_OPERATIONS.chat.maxOutputTokens,
      },
    );
    assistantText = result.text;
    tokensIn = result.tokensIn;
    tokensOut = result.tokensOut;
    stopReason = result.stopReason;
    usedModel = result.model;
    usage = result.usage;
  } catch (err) {
    // ── DUE casi rimborsabili per intero. Il primo: la richiesta ha superato la finestra ──
    // Con il taglio a CHAT_HISTORY_WINDOW questo non dovrebbe più accadere per
    // crescita della cronologia; resta come rete di sicurezza (un domani con un
    // cap più alto, un system prompt più grande o un modello con finestra più
    // piccola). È l'unico errore PERMANENTE: ritentare non può funzionare, e
    // senza rimborso ogni tentativo costerebbe un credito per niente.
    //
    // RIMBORSO UNA VOLTA SOLA, GARANTITO DALLA STRUTTURA: la riserva si chiude
    // in UNO solo di cinque rami che si escludono a vicenda, ognuno seguito da
    // return o throw — questo (rimborso intero), il limite di spesa di
    // Anthropic qui sotto (rimborso intero), keepOneCredit dopo un errore
    // del modello, keepOneCredit se il database fallisce prima della chiamata,
    // settleAiCredits dopo una risposta. Nessuno è dentro un ciclo o un retry, e
    // un secondo tentativo del cliente è una NUOVA richiesta con una propria
    // riserva da chiudere.
    if (isContextWindowError(err)) {
      console.error('[ai:error] surface=chat conversation beyond context window', err);
      try {
        await refundCredits(organizationId, spend);
      } catch (refundErr) {
        // Best-effort, stessa regola di insights/generate: se il rimborso
        // stesso fallisce, al cliente va comunque l'errore giusto e lo
        // scostamento sul saldo resta nei log per una correzione manuale.
        console.error('[ai/chat] credit refund FAILED after context-window error:', refundErr);
      }
      return fail('CONVERSATION_TOO_LONG', 413);
    }
    // ── Il secondo: Anthropic rifiuta per il limite di spesa o il saldo ──
    // Non è colpa del cliente e il modello non ha risposto: niente credito, e
    // un messaggio che non dice perché (vedi @/lib/ai/spend-limit).
    if (isAnthropicSpendLimitError(err)) {
      logAnthropicSpendLimit('chat', err);
      try {
        await refundCredits(organizationId, spend);
      } catch (refundErr) {
        console.error('[ai/chat] credit refund FAILED after the Anthropic spend limit:', refundErr);
      }
      return fail(AI_UNAVAILABLE, AI_UNAVAILABLE_STATUS);
    }
    // L'errore VERO resta nei log del server, per intero, con il marcatore
    // [ai:error] per ritrovarlo. Al browser va solo un messaggio generico: il
    // testo di un errore Anthropic puo' contenere dettagli sulla nostra
    // configurazione (modello, quote, forma della richiesta) che non hanno
    // motivo di uscire. Lo status 502 non cambia. Nessun rimborso, come prima.
    console.error('[ai:error] surface=chat', err);
    await keepOneCredit();
    return fail('AI_REQUEST_FAILED', 502);
  }

  // The real cost, never above the maximum reserved; the rest goes back now,
  // before anything else can fail. The number shown under the answer IS this
  // one, and it is the one the ledger records (-reserved, +unused).
  const settled = await settleAiCredits(
    organizationId,
    spend,
    // No usage at all (never seen in practice): 1, like a failed call.
    usage ? chargeFor('chat', usedModel, usage) : 1,
    usage ? { model: usedModel, usage } : null,
  );

  // Cut by the length ceiling: the customer is told so, in their language,
  // instead of receiving a sentence that stops halfway. Saved WITH the message,
  // so it is still there when the conversation is reopened.
  if (stopReason === 'max_tokens') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });
    const t = await getTranslations({ locale: user?.locale === 'en' ? 'en' : 'it', namespace: 'chat' });
    assistantText = `${assistantText.trimEnd()}…\n\n${t('answerTruncated')}`;
  }

  const assistantMessage = await prisma.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: assistantText,
      tokensIn,
      tokensOut,
    },
  });

  await prisma.aIConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  const refreshed = await prisma.aIConversation.findUniqueOrThrow({
    where: { id: conversation.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  return ok({
    conversation: toConversationDTO(refreshed),
    creditsRemaining: settled.remaining,
    creditsCharged: settled.charged,
    assistantMessageId: assistantMessage.id,
  });
}

/**
 * The demo visitor's request: one of the suggested questions (answered from
 * the cache, see demoSuggestedAnswer), or a free question — only while
 * DEMO_FREE_QUESTIONS is on (@/lib/demo/chat-mode). Today it is off.
 */
async function demoRequest(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  if (body && typeof body === 'object' && 'questionId' in body) return demoSuggestedAnswer(body);
  if (!DEMO_FREE_QUESTIONS) return fail('DEMO_FREE_QUESTIONS_OFF', 403);
  return demoChat(req, body);
}

const DemoAnswerSchema = z.object({
  questionId: z.enum(DEMO_SUGGESTED_QUESTIONS),
  locale: z.enum(['it', 'en']).default('it'),
});

/**
 * A SUGGESTED QUESTION IN THE DEMO (founder's decision: the demo costs nothing
 * per visitor). The answer comes from the cache (@/lib/demo/answer-cache); only
 * the first request after the question, the language, the model, the prompt or
 * the demo data changed calls the model — once, however many visitors ask at
 * the same moment. That call is logged as "demo-cache" on the [ai:usage] line.
 * Nothing is written to the database and no credit is involved; the visitor
 * is told the answer was generated before, and when (generatedAt).
 */
async function demoSuggestedAnswer(body: unknown) {
  const parsed = DemoAnswerSchema.safeParse(body);
  if (!parsed.success) return fail('INVALID_INPUT', 400);
  const { questionId, locale } = parsed.data;
  const t = await getTranslations({ locale, namespace: 'chat' });
  const question = t(`demoQuestions.${questionId}`);

  // A chat page opened last month asks after the month changed: the demo data
  // are brought to this month first, so the answer is not built on old rows.
  await ensureDemoDataCurrent(DEMO_ORG_ID).catch((err) => {
    console.error('[demo:data] rewrite failed, previous data kept:', err);
  });

  try {
    const key = demoAnswerKey({
      question,
      locale,
      model: modelFor('chat'),
      fingerprint: await demoDataFingerprint(),
    });
    const result = await getOrCreateDemoAnswer(key, async () => {
      const ctx = await loadBusinessContext(DEMO_ORG_ID, locale);
      const answer = await chatComplete(buildSystemPrompt(ctx, locale), [{ role: 'user', content: question }], {
        // Same model and ceiling as the paying chat; one question, no history.
        cacheSystemPrompt: true,
        logLabel: 'demo-cache',
        surface: 'chat',
        maxTokens: AI_OPERATIONS.chat.maxOutputTokens,
      });
      if (!answer.text.trim()) throw new Error('empty answer from the model');
      return answer.stopReason === 'max_tokens'
        ? `${answer.text.trimEnd()}…\n\n${t('answerTruncated')}`
        : answer.text;
    });
    return ok({ question, answer: result.answer, generatedAt: result.generatedAt, cached: result.fromCache });
  } catch (err) {
    // No cache, no answer: without it every visitor would pay for a call.
    if (err instanceof DemoCacheUnavailableError) return fail(AI_UNAVAILABLE, AI_UNAVAILABLE_STATUS);
    if (isAnthropicSpendLimitError(err)) {
      logAnthropicSpendLimit('demo-cache', err);
      return fail(AI_UNAVAILABLE, AI_UNAVAILABLE_STATUS);
    }
    console.error('[ai:error] surface=demo-cache', err);
    return fail('AI_REQUEST_FAILED', 502);
  }
}

const DemoSendSchema = z.object({
  message: z.string().min(1).max(4000),
  // The visitor's earlier turns, kept only in their browser: the 4 exchanges
  // before the 5th question, 5 when they try a 6th (refused below by the
  // count, not here by its shape). An answer is up to 8,000 tokens.
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(40000) }))
    .max(10)
    .default([]),
  locale: z.enum(['it', 'en']).default('it'),
});

/**
 * THE DEMO'S FREE QUESTIONS (founder's decision, 2026-10-03; switched off with
 * DEMO_FREE_QUESTIONS, the code is kept): an anonymous demo visitor may ask a
 * few questions of their own about the demo company.
 *
 *   • Nothing is written to the database: no conversation, no message, no
 *     credit. The thread lives in the visitor's browser and comes back in
 *     `history`, so no visitor can ever see another one's questions.
 *   • Paid by Anlyra: "chat:demo" on the [ai:usage] line says how much.
 *   • 5 questions per demo session, 5 a day per IP, 10 a day and 100 a month
 *     for the whole demo (@/lib/demo/chat-quota).
 *     A question that gets no answer is given back to the session.
 *   • Same model and same answer length as the paying chat.
 *
 * Only DEMO_ORG_ID is ever read here, whatever the request says.
 */
async function demoChat(req: NextRequest, body: unknown) {
  const parsed = DemoSendSchema.safeParse(body);
  if (!parsed.success) return fail('INVALID_INPUT', 400);
  const { message, history, locale } = parsed.data;
  // Turns alternate, starting with the visitor (what the model expects).
  if (history.some((m, i) => m.role !== (i % 2 === 0 ? 'user' : 'assistant'))) {
    return fail('INVALID_INPUT', 400);
  }

  const existingId = await readDemoChatSessionId();
  const sessionId = existingId ?? randomUUID();

  const question = await takeQuota('demo-chat-session', sessionId);
  if (!question.success) {
    return question.reason === 'unavailable'
      ? rateLimitResponse({ ...question, reset: 0 })
      : fail('DEMO_QUESTIONS_EXHAUSTED', 429);
  }
  const ipLimit = await checkRateLimit('demo-chat-ip', demoIpKey(getClientIp(req)));
  if (!ipLimit.success) {
    await returnQuota('demo-chat-session', sessionId);
    return ipLimit.reason === 'unavailable' ? rateLimitResponse(ipLimit) : fail('DEMO_QUESTIONS_EXHAUSTED', 429);
  }
  // The total for the whole demo today. Same answer as the session's end: the
  // visitor is invited to sign up and is not told which ceiling they met.
  const dayKey = demoDayKey();
  const today = await takeQuota('demo-chat-day', dayKey);
  if (!today.success) {
    await returnQuota('demo-chat-session', sessionId);
    return today.reason === 'unavailable' ? rateLimitResponse({ ...today, reset: 0 }) : fail('DEMO_QUESTIONS_EXHAUSTED', 429);
  }
  // And the total for the whole demo this month: the same answer again.
  const monthKey = demoMonthKey();
  const thisMonth = await takeQuota('demo-chat-month', monthKey);
  if (!thisMonth.success) {
    await returnQuota('demo-chat-session', sessionId);
    await returnQuota('demo-chat-day', dayKey);
    return thisMonth.reason === 'unavailable'
      ? rateLimitResponse({ ...thisMonth, reset: 0 })
      : fail('DEMO_QUESTIONS_EXHAUSTED', 429);
  }

  let result;
  try {
    const systemPrompt = buildSystemPrompt(await loadBusinessContext(DEMO_ORG_ID), 'IT');
    result = await chatComplete(systemPrompt, [...history, { role: 'user', content: message }], {
      // Same options as the paying chat above: the demo context is the same for
      // every visitor, so its cache is shared by all of them.
      cacheSystemPrompt: true,
      cacheLastMessage: true,
      logLabel: 'chat:demo',
      surface: 'chat',
      maxTokens: AI_OPERATIONS.chat.maxOutputTokens,
    });
  } catch (err) {
    // The question goes back to the session, the day and the month in both cases.
    await returnQuota('demo-chat-session', sessionId);
    await returnQuota('demo-chat-day', dayKey);
    await returnQuota('demo-chat-month', monthKey);
    if (isAnthropicSpendLimitError(err)) {
      logAnthropicSpendLimit('chat:demo', err);
      return fail(AI_UNAVAILABLE, AI_UNAVAILABLE_STATUS);
    }
    console.error('[ai:error] surface=chat:demo', err);
    return fail('AI_REQUEST_FAILED', 502);
  }

  let answer = result.text;
  if (result.stopReason === 'max_tokens') {
    const t = await getTranslations({ locale, namespace: 'chat' });
    answer = `${answer.trimEnd()}…\n\n${t('answerTruncated')}`;
  }

  const res = ok({ answer, questionsLeft: Math.min(question.remaining, today.remaining, thisMonth.remaining) });
  if (!existingId) {
    res.cookies.set(DEMO_CHAT_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: DEMO_CHAT_COOKIE_MAX_AGE,
    });
  }
  return res;
}
