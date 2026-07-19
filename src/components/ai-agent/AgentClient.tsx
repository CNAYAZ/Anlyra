'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, Sparkles, Send, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AnalysisMarkdown } from './AnalysisMarkdown';

type AgentMode = 'financial' | 'marketing' | 'kpi' | 'competitor' | 'chat';
const MODES: AgentMode[] = ['financial', 'marketing', 'kpi', 'competitor', 'chat'];

type ApiResponse = { success: boolean; data?: { text: string }; error?: string };

// Per-tab in-session memory: each mode keeps its own question/result/error/loading
// so switching tabs never discards a generated analysis (they cost ~3 cents each).
// Not persisted — reloading the page resets it, which is intentional here.
type TabState = { question: string; result: string | null; error: string | null; loading: boolean };
const EMPTY_TAB: TabState = { question: '', result: null, error: null, loading: false };

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
  // own `loading`. The target mode is captured so the response lands in the
  // right tab even if the user switched away meanwhile.
  async function run(withQuestion: boolean) {
    const m = mode;
    const st = states[m];
    if (st.loading) return;
    const q = st.question.trim();
    if (withQuestion && !q) return;

    patch(m, { loading: true, error: null, result: null });
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withQuestion ? { type: m, question: q } : { type: m }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (res.ok && json?.success && json.data?.text) {
        patch(m, { result: json.data.text });
      } else {
        patch(m, {
          error:
            res.status === 429
              ? t('errors.rateLimit')
              : res.status === 503
                ? t('errors.notConfigured')
                : t('errors.generic'),
        });
      }
    } catch {
      patch(m, { error: t('errors.generic') });
    } finally {
      patch(m, { loading: false });
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Mode tabs ── */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('subtitle')}>
        {MODES.map((m) => {
          const active = m === mode;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectMode(m)}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60',
                active
                  ? 'bg-sage-500 text-white'
                  : 'border border-border-strong bg-card text-fg-2 hover:bg-muted hover:text-foreground',
              )}
            >
              {t(`modes.${m}` as 'modes.financial')}
              {/* A subtle spinner marks a tab still analysing in the background. */}
              {states[m].loading && !active && (
                <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin align-[-2px]" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Action area ── */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-elev-1 space-y-3">
        {!isChat && (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => run(false)} loading={current.loading} disabled={current.loading}>
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
              disabled={current.loading || !current.question.trim()}
            >
              <Send className="h-4 w-4" />
              {t('send')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Result ── */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-elev-1 min-h-[160px]">
        {current.loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-sage-500" />
            {isChat ? t('thinking') : t('analyzing')}
          </div>
        ) : current.error ? (
          <div className="flex items-start gap-3 rounded-md border border-danger-500/30 bg-danger-500/5 p-4 text-sm text-danger-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{current.error}</span>
          </div>
        ) : current.result ? (
          <AnalysisMarkdown text={current.result} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Bot className="h-8 w-8 opacity-40" />
            {t('empty')}
          </div>
        )}
      </div>

      {/* ── Disclaimer (always visible) ── */}
      <p className="text-center text-xs text-fg-3">{t('disclaimer')}</p>
    </div>
  );
}
