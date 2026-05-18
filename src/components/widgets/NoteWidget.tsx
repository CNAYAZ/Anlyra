'use client';

import { useTranslations } from 'next-intl';
import type { Widget } from '@/lib/widgets/types';

export function NoteWidget({ widget }: { widget: Widget }) {
  const t = useTranslations('widgets.note');
  const text = widget.config.text?.trim();
  return (
    <div className="h-full overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground scrollbar-thin">
      {text || <span className="text-muted-foreground">{t('description')}</span>}
    </div>
  );
}
