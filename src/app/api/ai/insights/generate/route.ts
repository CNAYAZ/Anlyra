import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { consumeCredits, InsufficientCreditsError } from '@/lib/credits';
import { getAnthropicClient, isAnthropicConfigured, ANTHROPIC_MODEL, ANTHROPIC_TEMPERATURE } from '@/lib/anthropic';
import { buildSystemPrompt, loadBusinessContext } from '@/lib/ai-context';
import { mockInsights } from '@/lib/ai-mock';
import type { GenerateInsightsResponse, InsightDTO } from '@/types/ai';
import type { InsightPriority, InsightType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const TYPES: ReadonlyArray<InsightType> = ['STRATEGY', 'WARNING', 'OPPORTUNITY', 'ACTION'];
const PRIORITIES: ReadonlyArray<InsightPriority> = ['HIGH', 'MEDIUM', 'LOW'];

type RawInsight = {
  type: string;
  priority: string;
  title: string;
  summary: string;
  content: string;
  confidence: number;
};

function sanitizeInsights(arr: unknown): RawInsight[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => ({
      type: String(x.type ?? 'STRATEGY').toUpperCase(),
      priority: String(x.priority ?? 'MEDIUM').toUpperCase(),
      title: String(x.title ?? '').slice(0, 200),
      summary: String(x.summary ?? '').slice(0, 500),
      content: String(x.content ?? '').slice(0, 4000),
      confidence:
        typeof x.confidence === 'number'
          ? Math.max(0, Math.min(1, x.confidence > 1 ? x.confidence / 100 : x.confidence))
          : 0.7,
    }))
    .filter((x) => x.title && x.summary && x.content);
}

function coerceType(t: string): InsightType {
  return (TYPES as ReadonlyArray<string>).includes(t) ? (t as InsightType) : 'STRATEGY';
}
function coercePriority(p: string): InsightPriority {
  return (PRIORITIES as ReadonlyArray<string>).includes(p) ? (p as InsightPriority) : 'MEDIUM';
}

export async function POST() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail('UNAUTHORIZED', 401);
  }

  let creditsRemaining: number;
  try {
    creditsRemaining = await consumeCredits(session.organization.id, 3);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return fail('INSUFFICIENT_CREDITS', 402);
    }
    throw err;
  }

  const ctx = await loadBusinessContext(session.organization.id);
  let raw: RawInsight[] = [];

  if (isAnthropicConfigured()) {
    try {
      const client = getAnthropicClient();
      const systemPrompt = buildSystemPrompt(ctx, session.locale);
      const userPrompt =
        session.locale === 'IT'
          ? 'Genera 3 nuovi insight strategici basati sui dati. Rispondi SOLO con un array JSON valido, senza testo aggiuntivo. Schema per ogni insight: {"type":"STRATEGY|WARNING|OPPORTUNITY|ACTION","priority":"HIGH|MEDIUM|LOW","title":"<max 100 char>","summary":"<2-3 righe>","content":"<analisi dettagliata>","confidence":<0..1>}.'
          : 'Generate 3 new strategic insights based on the data. Respond ONLY with a valid JSON array, no extra text. Schema per insight: {"type":"STRATEGY|WARNING|OPPORTUNITY|ACTION","priority":"HIGH|MEDIUM|LOW","title":"<max 100 chars>","summary":"<2-3 lines>","content":"<detailed analysis>","confidence":<0..1>}.';

      const response = await client.messages.create({
        model: ANTHROPIC_MODEL,
        temperature: ANTHROPIC_TEMPERATURE,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((c) => c.type === 'text');
      const text = textBlock && textBlock.type === 'text' ? textBlock.text : '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      raw = sanitizeInsights(parsed);
    } catch (err) {
      console.error('Anthropic insight generation error:', err);
      raw = mockInsights(ctx, session.locale);
    }
  } else {
    raw = mockInsights(ctx, session.locale);
  }

  if (raw.length === 0) {
    raw = mockInsights(ctx, session.locale);
  }

  const created = await prisma.$transaction(
    raw.map((r) =>
      prisma.insight.create({
        data: {
          organizationId: session!.organization.id,
          type: coerceType(r.type),
          priority: coercePriority(r.priority),
          status: 'NEW',
          title: r.title,
          summary: r.summary,
          content: r.content,
          confidence: r.confidence,
        },
      })
    )
  );

  const data: InsightDTO[] = created.map((i) => ({
    id: i.id,
    type: i.type,
    priority: i.priority,
    status: i.status,
    title: i.title,
    summary: i.summary,
    content: i.content,
    confidence: i.confidence,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }));

  const response: GenerateInsightsResponse = { insights: data, creditsRemaining };
  return ok(response);
}
