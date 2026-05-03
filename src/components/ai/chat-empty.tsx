'use client';

import { useTranslations } from 'next-intl';
import { Bot } from 'lucide-react';

type Props = {
  company: string;
  onPickSuggestion: (text: string) => void;
};

export function ChatEmpty({ company, onPickSuggestion }: Props) {
  const t = useTranslations('chat');
  const suggestions = [t('suggestion1'), t('suggestion2'), t('suggestion3')];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent text-white">
        <Bot className="h-7 w-7" />
      </div>
      <h2 className="font-heading text-xl font-semibold">{t('emptyTitle')}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t('emptyDescription', { company })}</p>
      <div className="mt-6 grid w-full gap-2 sm:grid-cols-1">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPickSuggestion(s)}
            className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
