'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ChatSidebar } from '@/components/ai/chat-sidebar';
import { ChatMessage } from '@/components/ai/chat-message';
import { ChatInput } from '@/components/ai/chat-input';
import { ChatEmpty } from '@/components/ai/chat-empty';
import { NoCredits } from '@/components/ai/no-credits';
import { TypingIndicator } from '@/components/ai/typing-indicator';
import { AiCostCharged, useAiCost } from '@/components/ai/ai-cost';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreditsStore } from '@/stores/credits-store';
import { useIsReadOnlyRole } from '@/lib/auth/owner-context';
import { useIsDemo } from '@/lib/demo/context';
import { useDemoQuestionsStore } from '@/stores/demo-questions-store';
import { DEMO_FREE_QUESTIONS, DEMO_SUGGESTED_QUESTIONS, type DemoSuggestedQuestion } from '@/lib/demo/chat-mode';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import type { ApiResponse } from '@/lib/api';
import type {
  ChatMessageDTO,
  ConversationDetailDTO,
  ConversationListItemDTO,
  SendMessageResponse,
} from '@/types/ai';

type Props = {
  companyName: string;
  initialCredits: number;
  /** Demo only: questions left in this demo session (null: unknown). */
  initialDemoQuestionsLeft?: number | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new Error((json as { success: false; error: string }).error ?? 'Request failed');
  }
  if (json.data === undefined) {
    throw new Error('Request failed');
  }
  return json.data;
}

/**
 * How many recent messages /api/ai/chat actually sends to the model — mirrors
 * CHAT_HISTORY_WINDOW in that route (same convention as ANALYSIS_CREDIT_COST in
 * AgentClient.tsx and alert-detail.tsx). Used ONLY to decide when to tell the
 * user that older messages no longer reach the AI; the route is the source of
 * truth for what is actually sent.
 */
const CHAT_HISTORY_WINDOW = 40;

/**
 * Carries the HTTP status and the API error code from a failed /api/ai/chat
 * call, so the render below can pick the right message — same distinction
 * AgentClient.tsx makes for /api/ai/analyze (402 has two different meanings,
 * 503 has two different meanings; status alone cannot tell them apart).
 */
class ChatRequestError extends Error {
  constructor(
    public status: number,
    public code: string | null,
  ) {
    super(code ?? 'Request failed');
  }
}

async function sendChatMessage(vars: {
  conversationId: string | null;
  message: string;
}): Promise<SendMessageResponse> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(vars),
  });
  const json = (await res.json()) as ApiResponse<SendMessageResponse>;
  if (!res.ok || !json.success) {
    throw new ChatRequestError(res.status, json.success ? null : json.error);
  }
  if (json.data === undefined) {
    throw new ChatRequestError(res.status, null);
  }
  return json.data;
}

/**
 * The demo chat: the same route, but nothing is saved server-side, so the
 * thread lives here and goes back as `history` (see demoChat in the route).
 */
async function sendDemoMessage(vars: {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  locale: string;
}): Promise<{ answer: string; questionsLeft: number }> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(vars),
  });
  const json = (await res.json()) as ApiResponse<{ answer: string; questionsLeft: number }>;
  if (!res.ok || !json.success || json.data === undefined) {
    throw new ChatRequestError(res.status, json.success ? null : json.error);
  }
  return json.data;
}

/**
 * One of the demo's suggested questions: the answer comes from the cache, or
 * is generated once for everyone (see demoSuggestedAnswer in the route).
 */
async function askDemoQuestion(vars: {
  questionId: DemoSuggestedQuestion;
  locale: string;
}): Promise<{ question: string; answer: string; generatedAt: string }> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(vars),
  });
  const json = (await res.json()) as ApiResponse<{ question: string; answer: string; generatedAt: string }>;
  if (!res.ok || !json.success || json.data === undefined) {
    throw new ChatRequestError(res.status, json.success ? null : json.error);
  }
  return json.data;
}

export function ChatClient({ companyName, initialCredits, initialDemoQuestionsLeft = null }: Props) {
  const t = useTranslations('chat');
  // Viewer: past conversations stay readable; asking a new question spends
  // the organization's credits and adds to its shared conversation list, so it
  // is disabled — refused server-side by requireEditorRole anyway.
  const readOnlyRole = useIsReadOnlyRole();
  const tSettings = useTranslations('settings');
  const tCommon = useTranslations('common');
  // Reuses the AI Agent's disclaimer copy/key on purpose: one source of truth
  // for "you're talking to an AI" across both surfaces (AI Act art. 50).
  const tAgent = useTranslations('agent');
  const tDemo = useTranslations('demo');
  const locale = useLocale();
  const isDemo = useIsDemo();
  const [demoMessages, setDemoMessages] = useState<ChatMessageDTO[]>([]);
  // Demo answers that came from the cache: when each was generated, by message id.
  const [origins, setOrigins] = useState<Record<string, string>>({});
  // Shared with the top bar. The server value until the store has been set.
  const storeLeft = useDemoQuestionsStore((s) => s.left);
  const setDemoLeft = useDemoQuestionsStore((s) => s.setLeft);
  const demoLeft = storeLeft ?? initialDemoQuestionsLeft;
  const qc = useQueryClient();
  const credits = useCreditsStore((s) => s.credits);
  const setCredits = useCreditsStore((s) => s.setCredits);
  const cost = useAiCost();
  // The route reserves the MAXIMUM a message can cost and refuses below it.
  const chatMax = cost.max('chat');
  const [activeId, setActiveId] = useState<string | null>(null);
  // Real cost of each answer received in this visit, by message id. Answers
  // loaded from an older visit have no cost stored with them, so none is shown.
  const [charges, setCharges] = useState<Record<string, number>>({});
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Auto-select the most recent conversation only once, on first load — not every
  // time activeId becomes null, otherwise "Nuova conversazione" would be undone by
  // this same effect re-selecting the previous conversation.
  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    setCredits(initialCredits);
  }, [initialCredits, setCredits]);

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () =>
      fetchJson<{ conversations: ConversationListItemDTO[] }>('/api/ai/chat/conversations').then((d) => d.conversations),
    // The demo saves no conversation: there is nothing of the visitor's to list.
    enabled: !isDemo,
  });

  useEffect(() => {
    if (hasAutoSelectedRef.current || !conversationsQuery.data) return;
    hasAutoSelectedRef.current = true;
    if (conversationsQuery.data.length > 0) {
      setActiveId(conversationsQuery.data[0].id);
    }
  }, [conversationsQuery.data]);

  const conversationQuery = useQuery({
    queryKey: ['conversation', activeId],
    queryFn: () =>
      fetchJson<{ conversation: ConversationDetailDTO }>(`/api/ai/chat/conversations/${activeId}`).then((d) => d.conversation),
    enabled: Boolean(activeId),
  });

  const sendMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (res) => {
      setCredits(res.creditsRemaining);
      setCharges((c) => ({ ...c, [res.assistantMessageId]: res.creditsCharged }));
      setActiveId(res.conversation.id);
      qc.setQueryData(['conversation', res.conversation.id], res.conversation);
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setPendingUser(null);
    },
    onError: () => {
      // A 402 INSUFFICIENT_CREDITS means "below the maximum", not "zero": the
      // counter is left as it is and the message says how many are needed.
      setPendingUser(null);
    },
  });

  const demoMutation = useMutation({
    mutationFn: sendDemoMessage,
    onSuccess: (res, vars) => {
      const at = new Date().toISOString();
      setDemoMessages((m) => [
        ...m,
        { id: `demo-${m.length}`, role: 'USER', content: vars.message, createdAt: at },
        { id: `demo-${m.length + 1}`, role: 'ASSISTANT', content: res.answer, createdAt: at },
      ]);
      setDemoLeft(res.questionsLeft);
      setPendingUser(null);
    },
    onError: (err) => {
      if (err instanceof ChatRequestError && err.code === 'DEMO_QUESTIONS_EXHAUSTED') setDemoLeft(0);
      setPendingUser(null);
    },
  });
  const suggestedMutation = useMutation({
    mutationFn: askDemoQuestion,
    onSuccess: (res) => {
      const at = new Date().toISOString();
      const answerId = `demo-cached-${at}`;
      setDemoMessages((m) => [
        ...m,
        { id: `demo-question-${at}`, role: 'USER', content: res.question, createdAt: at },
        { id: answerId, role: 'ASSISTANT', content: res.answer, createdAt: res.generatedAt },
      ]);
      setOrigins((o) => ({ ...o, [answerId]: res.generatedAt }));
      setPendingUser(null);
    },
    onError: () => setPendingUser(null),
  });
  // In the demo, the state shown (pending, error) is the latest request's.
  const demoSend = demoMutation.submittedAt > suggestedMutation.submittedAt ? demoMutation : suggestedMutation;
  const send = isDemo ? demoSend : sendMutation;
  const demoOver = isDemo && demoLeft === 0;

  function askSuggested(questionId: DemoSuggestedQuestion) {
    setPendingUser(t(`demoQuestions.${questionId}`));
    suggestedMutation.mutate({ questionId, locale });
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversationQuery.data, demoMessages, pendingUser, send.isPending]);

  function handleSend(text: string) {
    if (isDemo) {
      if (demoOver) return;
      setPendingUser(text);
      demoMutation.mutate({
        message: text,
        history: demoMessages.map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content })),
        locale,
      });
      return;
    }
    if (credits < chatMax) return;
    setPendingUser(text);
    sendMutation.mutate({ conversationId: activeId, message: text });
  }

  function handleNew() {
    setDemoMessages([]);
    setActiveId(null);
    setPendingUser(null);
  }

  const messages: ChatMessageDTO[] = isDemo ? demoMessages : conversationQuery.data?.messages ?? [];
  // Not after a failed send: on a brand-new conversation the empty state used
  // to replace the error, so a refused first question simply vanished.
  const showEmpty =
    (isDemo ? demoMessages.length === 0 : !activeId) && !pendingUser && !send.isPending && !send.isError;
  // The demo spends no credits (the founder pays for it).
  const noCredits = !isDemo && credits <= 0;
  const notEnoughCredits = !isDemo && credits < chatMax;

  // Same status/code priority as AgentClient.tsx's error mapping for
  // /api/ai/analyze: INSUFFICIENT_CREDITS before a bare 402, the rate-limiter
  // outage code before a bare 429/503, then status-only, then the generic
  // fallback already used by this file for every other kind of failure.
  const sendError = send.error;
  const sendErrorMessage =
    sendError instanceof ChatRequestError
      ? sendError.status === 402 && sendError.code === 'INSUFFICIENT_CREDITS'
        ? cost.insufficient('chat', credits)
        : sendError.code === 'RATE_LIMIT_UNAVAILABLE'
          ? tAgent('errors.rateLimitUnavailable')
          : // Anthropic refused for its spend limit or balance: the AI is
            // unavailable, nothing was charged, and the reason is not shown.
            sendError.code === 'AI_UNAVAILABLE'
            ? tCommon('aiUnavailable')
            : // The thread outgrew the model's context window: permanent for THIS
            // conversation, and the route refunded the credit before answering —
            // so the message says both, and what to do about it.
            sendError.code === 'CONVERSATION_TOO_LONG'
            ? t('conversationTooLong')
            : sendError.status === 402
              ? tAgent('errors.trialExpired')
              : sendError.status === 429
                ? tAgent('errors.rateLimit')
                : sendError.status === 503
                  ? tAgent('errors.notConfigured')
                  : t('errorSending')
      : t('errorSending');

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ChatSidebar
        conversations={isDemo ? [] : conversationsQuery.data}
        loading={conversationsQuery.isLoading}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-card/40 px-6 py-3">
          <h1 className="font-heading text-base font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {readOnlyRole && messages.length === 0 ? (
            <p className="mx-auto max-w-md pt-12 text-center text-sm text-muted-foreground">{tSettings('readOnlyRoleShort')}</p>
          ) : noCredits && messages.length === 0 ? (
            <NoCredits />
          ) : showEmpty && isDemo ? (
            // Demo: the eight questions, in full, before the first answer.
            <div className="mx-auto max-w-2xl pt-8">
              <p className="mb-4 text-center text-sm text-muted-foreground">{t('demoPickQuestion')}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {DEMO_SUGGESTED_QUESTIONS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => askSuggested(id)}
                    disabled={send.isPending}
                    className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {t(`demoQuestions.${id}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : showEmpty ? (
            <ChatEmpty company={companyName} onPickSuggestion={handleSend} />
          ) : conversationQuery.isLoading && activeId ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="ml-auto h-16 w-1/2" />
              <Skeleton className="h-24 w-3/4" />
            </div>
          ) : conversationQuery.isError ? (
            <p className="text-center text-sm text-danger">{tCommon('errorGeneric')}</p>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {/* Past this length the route sends the model only the most
                  recent slice of the thread (CHAT_HISTORY_WINDOW). Saying so
                  is the honest half of that trade: the older messages are
                  still here to read, but the AI no longer sees them, and a
                  customer asking "do you remember what I said earlier?"
                  deserves to know why the answer is no. */}
              {messages.length > CHAT_HISTORY_WINDOW && (
                <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
                  {t('historyTrimmedNotice', { count: CHAT_HISTORY_WINDOW })}
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id}>
                  <ChatMessage role={m.role} content={m.content} />
                  {charges[m.id] !== undefined && <AiCostCharged credits={charges[m.id]} className="mt-1 pl-12" />}
                  {/* Demo: the answer was prepared before, and the visitor is told so. */}
                  {origins[m.id] !== undefined && (
                    <p className="mt-1 pl-12 text-xs text-muted-foreground">
                      {t('demoAnswerOrigin', { date: formatDate(origins[m.id], locale as Locale) })}
                    </p>
                  )}
                </div>
              ))}
              {pendingUser && <ChatMessage role="USER" content={pendingUser} />}
              {send.isPending && (
                <div className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white">
                    <span className="text-xs">AI</span>
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-3">
                    <TypingIndicator />
                  </div>
                </div>
              )}
              {send.isError && !demoOver && (
                <p className="text-center text-sm text-danger">
                  {sendErrorMessage}
                  {/* Out of credits: the way out is the Credits page (balance,
                      packs, and — for whoever cannot buy — why not). */}
                  {sendError instanceof ChatRequestError && sendError.status === 402 && sendError.code === 'INSUFFICIENT_CREDITS' && (
                    <>
                      {' '}
                      <Link href="/settings/credits" className="font-medium underline-offset-4 hover:underline">
                        {tCommon('goToCredits')}
                      </Link>
                    </>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Disclaimer: always visible, from the very first contact (including
            the empty state before the user has typed anything) — not just
            after a reply arrives. Second link points to the same privacy-page
            box, now covering what's actually sent to Anthropic (company data,
            client/vendor names, and — specific to chat — the message text and
            full conversation history), so the chat line itself stays short. */}
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 border-t border-border bg-card/40 px-6 py-2 text-center text-xs text-fg-3">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {tAgent('disclaimer')}{' '}
          <Link href="/legal/privacy" className="underline hover:text-foreground">
            {tAgent('disclaimerLinkLabel')}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/legal/privacy" className="underline hover:text-foreground">
            {t('dataHandlingLinkLabel')}
          </Link>
        </p>

        {/* Below the maximum a message can cost: said BEFORE the customer
            types, not only after a refused send. */}
        {notEnoughCredits && !noCredits && !readOnlyRole && (
          <p className="border-t border-border bg-warning/10 px-6 py-2 text-center text-xs tabular-nums text-foreground">
            {cost.insufficient('chat', credits)}{' '}
            <Link href="/settings/credits" className="font-medium underline-offset-4 hover:underline">
              {tCommon('goToCredits')}
            </Link>
          </p>
        )}

        {/* Demo: how many questions are left, then the way to go on with
            the visitor's own numbers. */}
        {isDemo && demoLeft !== null && (
          <p className="border-t border-border bg-muted/40 px-6 py-2 text-center text-xs tabular-nums text-foreground">
            {demoOver ? (
              <>
                {t('demoQuestionsOver')}{' '}
                <Link href="/signup" className="font-medium underline-offset-4 hover:underline">
                  {tDemo('banner.cta')}
                </Link>
              </>
            ) : (
              t('demoQuestionsLeft', { count: demoLeft })
            )}
          </p>
        )}

        {/* Demo, after the first answer: the same questions in one row that
            scrolls sideways, answered from the cache at no cost. */}
        {isDemo && !showEmpty && (
          <div className="flex gap-2 overflow-x-auto border-t border-border px-6 py-3">
            {DEMO_SUGGESTED_QUESTIONS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => askSuggested(id)}
                disabled={send.isPending}
                className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {t(`demoQuestions.${id}`)}
              </button>
            ))}
          </div>
        )}

        {/* Demo with free questions off (DEMO_FREE_QUESTIONS): the text field
            becomes the invitation to ask one's own questions on one's own data. */}
        {isDemo && !DEMO_FREE_QUESTIONS ? (
          <p className="border-t border-border bg-muted/40 px-6 py-4 text-center text-sm text-foreground">
            {t('demoAskOwn')}{' '}
            <Link href="/signup" className="font-medium text-primary-accent underline-offset-4 hover:underline">
              {tDemo('banner.cta')}
            </Link>
          </p>
        ) : (
          <ChatInput
            onSend={handleSend}
            disabled={readOnlyRole || notEnoughCredits || demoOver || send.isPending}
            placeholder={readOnlyRole ? tSettings('readOnlyRoleShort') : undefined}
          />
        )}
      </section>
    </div>
  );
}
