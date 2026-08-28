'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  Info,
  TrendingUp,
  Megaphone,
  Gauge,
  Swords,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useCreditsStore } from '@/stores/credits-store';
import { AnalysisMarkdown } from './AnalysisMarkdown';

// Cost of one /api/ai/analyze call (any mode, streaming or not) — see the
// route's ANALYSIS_CREDIT_COST. Used only to decide when to disable the
// Generate/Send buttons ahead of a request; the server is the source of truth.
const ANALYSIS_CREDIT_COST = 1;

type AgentMode = 'financial' | 'marketing' | 'kpi' | 'competitor' | 'chat';
const MODES: AgentMode[] = ['financial', 'marketing', 'kpi', 'competitor', 'chat'];

// One icon per mode, from lucide-react (the app's icon set, used across the nav)
// so the agent's tabs read the same visual language as the rest of the app.
const MODE_ICON: Record<AgentMode, LucideIcon> = {
  financial: TrendingUp,
  marketing: Megaphone,
  kpi: Gauge,
  competitor: Swords,
  chat: MessageSquare,
};

// Per-tab in-session memory: each mode keeps its own question/result/error/loading
// so switching tabs never discards a generated analysis (they cost ~3 cents each).
// Not persisted — reloading the page resets it, which is intentional here.
type TabState = {
  question: string;
  result: string | null;
  error: string | null;
  // True only when `error` is specifically INSUFFICIENT_CREDITS — lets the
  // result panel show an Upgrade link instead of a dead-end message.
  creditsExhausted: boolean;
  loading: boolean;
};
const EMPTY_TAB: TabState = { question: '', result: null, error: null, creditsExhausted: false, loading: false };

function initialStates(): Record<AgentMode, TabState> {
  return {
    financial: { ...EMPTY_TAB },
    marketing: { ...EMPTY_TAB },
    kpi: { ...EMPTY_TAB },
    competitor: { ...EMPTY_TAB },
    chat: { ...EMPTY_TAB },
  };
}

export function AgentClient() {
  const t = useTranslations('agent');
  const tCommon = useTranslations('common');
  const credits = useCreditsStore((s) => s.credits);
  const hasCredits = credits >= ANALYSIS_CREDIT_COST;

  const [mode, setMode] = useState<AgentMode>('financial');
  const [states, setStates] = useState<Record<AgentMode, TabState>>(initialStates);

  const current = states[mode];
  const isChat = mode === 'chat';

  // Functional update so sequential/async patches (across a fetch) never clobber
  // each other or a different tab's slice.
  function patch(m: AgentMode, p: Partial<TabState>) {
    setStates((s) => ({ ...s, [m]: { ...s[m], ...p } }));
  }

  // Switching tabs only changes which slice is shown — nothing is cleared, and it
  // stays allowed while a tab is loading (you can leave and come back to it).
  function selectMode(next: AgentMode) {
    if (next === mode) return;
    setMode(next);
  }

  // Single call path for both "generate full analysis" (no question) and a
  // targeted question. AI calls are expensive, so callers guard on the tab's
  // own `loading`. The target mode is captured so the streamed text lands in the
  // right tab even if the user switched away meanwhile. The response is streamed:
  // the HTTP status decides pre-stream errors (429/503/generic) BEFORE reading
  // the body; a failure mid-stream keeps the partial text and shows a notice.
  async function run(withQuestion: boolean) {
    const m = mode;
    const st = states[m];
    if (st.loading || !hasCredits) return;
    const q = st.question.trim();
    if (withQuestion && !q) return;

    patch(m, { loading: true, error: null, creditsExhausted: false, result: null });
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(withQuestion ? { type: m, question: q } : { type: m }), stream: true }),
      });

      if (!res.ok || !res.body) {
        // The route answers 402 for TWO different reasons (see requireActiveAccess
        // vs consumeCredits in /api/ai/analyze) and always as a JSON envelope, even
        // on the streaming path — read the body to tell them apart instead of
        // assuming every 402 means the trial ended.
        let code: string | null = null;
        try {
          const body = (await res.json()) as { success: boolean; error?: string };
          if (!body.success && typeof body.error === 'string') code = body.error;
        } catch {
          // Not JSON (shouldn't happen for this route) — fall through to the
          // status-only mapping below.
        }
        const insufficientCredits = res.status === 402 && code === 'INSUFFICIENT_CREDITS';
        // RATE_LIMIT_UNAVAILABLE is also a 503, but it means "the rate limiter
        // is down and this bucket is fail-closed" — NOT "the AI is not
        // configured". Checked on the CODE before the status, or the user would
        // be told to contact support about a transient outage that clears itself.
        const rateLimiterDown = code === 'RATE_LIMIT_UNAVAILABLE';
        patch(m, {
          error: insufficientCredits
            ? t('errors.noCredits')
            : rateLimiterDown
              ? t('errors.rateLimitUnavailable')
              : res.status === 402
                ? t('errors.trialExpired')
                : res.status === 429
                  ? t('errors.rateLimit')
                  : res.status === 503
                    ? t('errors.notConfigured')
                    : t('errors.generic'),
          creditsExhausted: insufficientCredits,
          loading: false,
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        patch(m, { result: acc }); // grow the visible text as tokens arrive
      }
      acc += decoder.decode(); // flush any trailing multibyte bytes
      patch(m, { result: acc, loading: false });
    } catch {
      // Network/read error mid-stream: keep the partial text already shown and
      // surface a notice next to it.
      patch(m, { error: t('errors.generic'), loading: false });
    }
  }

  const ActiveIcon = MODE_ICON[mode];

  return (
    <div className="space-y-5">
      {/* ── Mode tabs (segmented control) ── */}
      <div
        role="tablist"
        aria-label={t('subtitle')}
        className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-border bg-card p-1 shadow-elev-1"
      >
        {MODES.map((m) => {
          const active = m === mode;
          const Icon = MODE_ICON[m];
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectMode(m)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-1',
                active
                  ? 'bg-sage-500 text-white shadow-sm'
                  : 'text-fg-2 hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t(`modes.${m}` as 'modes.financial')}
              {/* A subtle spinner marks a tab still analysing in the background. */}
              {states[m].loading && !active && (
                <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Action area ── */}
      <div className="rounded-card border border-border bg-card p-5 shadow-card space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-fg-3">
          <ActiveIcon className="h-3.5 w-3.5" aria-hidden />
          {t(`modes.${mode}` as 'modes.financial')}
        </div>

        {!isChat && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => run(false)}
              loading={current.loading}
              disabled={current.loading || !hasCredits}
              title={!hasCredits ? t('errors.noCredits') : undefined}
            >
              <Sparkles className="h-4 w-4" />
              {t('generate')}
            </Button>
            <span className="text-xs text-fg-3">{t('orAsk')}</span>
          </div>
        )}

        <div className="space-y-2">
          <Textarea
            value={current.question}
            onChange={(e) => patch(mode, { question: e.target.value })}
            disabled={current.loading}
            placeholder={isChat ? t('chatPlaceholder') : t('questionPlaceholder')}
            rows={3}
            onKeyDown={(e) => {
              // Cmd/Ctrl+Enter submits the question.
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void run(true);
              }
            }}
          />
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => run(true)}
              loading={current.loading}
              disabled={current.loading || !current.question.trim() || !hasCredits}
              title={!hasCredits ? t('errors.noCredits') : undefined}
            >
              <Send className="h-4 w-4" />
              {t('send')}
            </Button>
          </div>
        </div>

        {/* Proactive notice — shown BEFORE the user presses a now-disabled
            button, not just after a failed request. */}
        {!hasCredits && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
            <span>{t('errors.noCredits')}</span>
            <Link
              href="/settings/billing"
              className="shrink-0 font-medium underline-offset-4 hover:underline"
            >
              {tCommon('upgrade')}
            </Link>
          </div>
        )}
      </div>

      {/* ── Result (presented as a report card) ── */}
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        {/* Report header: mode icon + name, with a live "typing" badge while streaming */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sage-50 text-sage-600 dark:bg-sage-700/30 dark:text-sage-300">
            <ActiveIcon className="h-4 w-4" aria-hidden />
          </span>
          <p className="font-heading text-sm font-semibold leading-none text-foreground">
            {t(`modes.${mode}` as 'modes.financial')}
          </p>
          {current.loading && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-sage-600 dark:text-sage-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
              {isChat ? t('thinking') : t('analyzing')}
            </span>
          )}
        </div>

        <div className="min-h-[180px] p-5 sm:p-6">
          {current.loading && !current.result ? (
            // Waiting for the first token.
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-sage-500 motion-reduce:animate-none" aria-hidden />
              {isChat ? t('thinking') : t('analyzing')}
            </div>
          ) : current.result ? (
            // Streaming or finished: render the markdown so far (react-markdown is
            // resilient to partial markdown; GFM tables settle once complete).
            <div>
              <AnalysisMarkdown text={current.result} />
              {current.loading && (
                <span
                  className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-sage-500 align-[-2px] motion-reduce:animate-none"
                  aria-hidden
                />
              )}
              {current.error && (
                <p className="mt-3 flex items-center gap-2 text-sm text-danger-700">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  {current.error}
                </p>
              )}
            </div>
          ) : current.error ? (
            // Pre-stream error (no text arrived).
            <div className="flex items-start gap-3 rounded-md border border-danger-500/30 bg-danger-500/5 p-4 text-sm text-danger-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="space-y-1">
                <p>{current.error}</p>
                {current.creditsExhausted && (
                  <Link
                    href="/settings/billing"
                    className="inline-block font-medium underline-offset-4 hover:underline"
                  >
                    {tCommon('upgrade')}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-sm text-muted-foreground">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-sage-50 text-sage-600 dark:bg-sage-700/30 dark:text-sage-300">
                <Bot className="h-6 w-6" aria-hidden />
              </span>
              <span className="max-w-sm">{t('empty')}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Disclaimer (always visible) ── */}
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-xs text-fg-3">
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {t('disclaimer')}{' '}
        <Link href="/legal/privacy" className="underline hover:text-foreground">
          {t('disclaimerLinkLabel')}
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal/privacy" className="underline hover:text-foreground">
          {t('dataHandlingLinkLabel')}
        </Link>
      </p>
    </div>
  );
}
