import { useTranslations } from 'next-intl';

export function TypingIndicator() {
  const t = useTranslations('chat');
  return (
    <div className="flex items-center gap-2 text-muted-foreground" aria-live="polite">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="ml-2 text-xs">{t('thinking')}</span>
    </div>
  );
}
