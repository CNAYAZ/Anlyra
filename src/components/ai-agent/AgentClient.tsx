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

export function AgentClient() {
  const t = useTranslations('agent');

  const [mode, setMode] = useState<AgentMode>('financial');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isChat = mode === 'chat';

  function selectMode(next: AgentMode) {
    if (loading || next === mode) return;
    setMode(next);
    // A result belongs to the mode that produced it — don't carry it across tabs.
    setResult(null);
    setError(null);
    setQuestion('');
  }

  // Single call path for both "generate full analysis" (no question) and a
  // targeted question. AI calls are expensive, so callers guard on `loading`.
  async function run(withQuestion: boolean) {
    if (loading) return;
    const q = question.trim();
    if (withQuestion && !q) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withQuestion ? { type: mode, question: q } : { type: mode }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (res.ok && json?.success && json.data?.text) {
        setResult(json.data.text);
      } else {
        setError(
          res.status === 429
            ? t('errors.rateLimit')
            : res.status === 503
              ? t('errors.notConfigured')
              : t('errors.generic'),
        );
      }
    } catch {
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
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
              disabled={loading}
              onClick={() => selectMode(m)}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60',
                active
                  ? 'bg-sage-500 text-white'
                  : 'border border-border-strong bg-card text-fg-2 hover:bg-muted hover:text-foreground',
              )}
            >
              {t(`modes.${m}` as 'modes.financial')}
            </button>
          );
        })}
      </div>

      {/* ── Action area ── */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-elev-1 space-y-3">
        {!isChat && (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => run(false)} loading={loading} disabled={loading}>
              <Sparkles className="h-4 w-4" />
              {t('generate')}
            </Button>
            <span className="text-xs text-fg-3">{t('orAsk')}</span>
          </div>
        )}

        <div className="space-y-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
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
              loading={loading}
              disabled={loading || !question.trim()}
            >
              <Send className="h-4 w-4" />
              {t('send')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Result ── */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-elev-1 min-h-[160px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-sage-500" />
            {isChat ? t('thinking') : t('analyzing')}
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-md border border-danger-500/30 bg-danger-500/5 p-4 text-sm text-danger-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : result ? (
          <AnalysisMarkdown text={result} />
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
