import { createHash, randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/rate-limit';
import { DEMO_ORG_ID } from '@/lib/session';
import { buildSystemPrompt, type AIBusinessContext } from '@/lib/ai-context';
import { toAppDateString } from '@/lib/timezone';

/**
 * THE DEMO'S PREPARED ANSWERS (founder's decision: the demo costs nothing per
 * visitor). The first request for a suggested question gets a real answer from
 * the model; it is kept in Upstash and every later request gets that one,
 * without calling Anthropic. No database table, so no migration.
 *
 * The key holds everything the answer depends on, so an answer that no longer
 * matches is simply never found again and is regenerated on the next request:
 *   • the question's text and the language;
 *   • the model;
 *   • the prompt: DEMO_ANSWER_VERSION, plus a hash of buildSystemPrompt's own
 *     instructions (so editing them regenerates without anyone remembering);
 *   • what the AI reads of the demo company: demoDataFingerprint.
 */

/** Bump to regenerate every demo answer by hand (e.g. after changing the demo questions' behaviour). */
const DEMO_ANSWER_VERSION = 1;

/** Old keys are never read again once something changes; this only cleans them up. */
const ANSWER_TTL_SECONDS = 40 * 24 * 60 * 60;

/** Longer than any generation (8,000 output tokens), so a working holder never loses it. */
const LOCK_SECONDS = 180;
/** How long a second visitor waits for the answer someone else is generating. */
const WAIT_MS = 150_000;
const POLL_MS = 500;

export type DemoAnswer = { answer: string; generatedAt: string };

export class DemoCacheUnavailableError extends Error {
  constructor() {
    super('DEMO_CACHE_UNAVAILABLE');
    this.name = 'DemoCacheUnavailableError';
  }
}

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * What the AI reads of the demo company, as a fingerprint.
 *
 * The demo rows are written once (seedDemoData, with dates relative to the day
 * they were seeded) and never rewritten, but the context the model receives is
 * computed against TODAY: the last 3 months, the facts, the days a receivable
 * is overdue. Hashing that context would change every day and regenerate every
 * answer daily. So the fingerprint is the stored data itself — the company,
 * the financial records (count, total, dates), every receivable and recurring
 * expense — plus the Italian calendar MONTH, the window the AI reads: a new
 * month regenerates the answers, so they do not describe months the pages no
 * longer show. Within a month an answer keeps the day it was generated on,
 * and says so (chat.demoAnswerOrigin).
 */
export async function demoDataFingerprint(now: Date = new Date()): Promise<string> {
  const where = { organizationId: DEMO_ORG_ID };
  const [org, records, receivables, recurring] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: DEMO_ORG_ID },
      select: { name: true, industry: true, employees: true, currency: true },
    }),
    prisma.financialRecord.aggregate({
      where,
      _count: true,
      _sum: { amount: true },
      _min: { occurredAt: true },
      _max: { occurredAt: true, createdAt: true },
    }),
    prisma.receivable.findMany({ where, orderBy: { id: 'asc' } }),
    prisma.recurringExpense.findMany({ where, orderBy: { id: 'asc' } }),
  ]);
  return sha(
    JSON.stringify({ org, records, receivables, recurring, month: toAppDateString(now).slice(0, 7) }),
  ).slice(0, 24);
}

/** buildSystemPrompt's instructions without any data: changes only when the prompt's code does. */
function promptTemplateHash(): string {
  const empty = {
    company: '',
    industry: '',
    employees: 0,
    financials: [],
    facts: [],
    changes: { ricavi: null, costi: null },
  } as unknown as AIBusinessContext;
  return sha(buildSystemPrompt(empty, 'IT')).slice(0, 16);
}

export function demoAnswerKey(parts: {
  question: string;
  locale: string;
  model: string;
  fingerprint: string;
}): string {
  return sha(
    JSON.stringify({ ...parts, version: DEMO_ANSWER_VERSION, prompt: promptTemplateHash() }),
  ).slice(0, 40);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The cached answer for `key`, or `generate()`'s — called by ONE request only.
 *
 * Two visitors asking the same new question at the same moment: the first
 * takes a lock (SET NX with an expiry) and calls the model; the other waits for
 * the answer to appear. If the holder fails, the lock goes and the next waiter
 * takes it. If Redis cannot be reached, nothing is generated
 * (DemoCacheUnavailableError): without the cache every visitor would pay.
 * A failed generation stores nothing; its error reaches the caller.
 */
export async function getOrCreateDemoAnswer(
  key: string,
  generate: () => Promise<string>,
): Promise<DemoAnswer & { fromCache: boolean }> {
  const redis = getRedis();
  if (!redis) throw new DemoCacheUnavailableError();
  const answerKey = `demo-answer:${key}`;
  const lockKey = `demo-answer-lock:${key}`;
  const deadline = Date.now() + WAIT_MS;

  for (;;) {
    let hit: DemoAnswer | null;
    let locked: string | null;
    const token = randomUUID();
    try {
      hit = await redis.get<DemoAnswer>(answerKey);
      if (hit) return { ...hit, fromCache: true };
      locked = await redis.set(lockKey, token, { nx: true, ex: LOCK_SECONDS });
    } catch (err) {
      console.error('[demo:answer-cache] Redis unreachable:', err);
      throw new DemoCacheUnavailableError();
    }

    if (locked === 'OK') {
      try {
        // The previous holder may have stored it between our read and our lock.
        const again = await redis.get<DemoAnswer>(answerKey);
        if (again) return { ...again, fromCache: true };
        const stored: DemoAnswer = { answer: await generate(), generatedAt: new Date().toISOString() };
        await redis.set(answerKey, stored, { ex: ANSWER_TTL_SECONDS });
        return { ...stored, fromCache: false };
      } finally {
        try {
          // Only our own lock (not atomic, but the expiry is far longer than a generation).
          if ((await redis.get<string>(lockKey)) === token) await redis.del(lockKey);
        } catch (err) {
          console.error('[demo:answer-cache] lock release failed (it expires by itself):', err);
        }
      }
    }

    if (Date.now() > deadline) throw new DemoCacheUnavailableError();
    await sleep(POLL_MS);
  }
}
