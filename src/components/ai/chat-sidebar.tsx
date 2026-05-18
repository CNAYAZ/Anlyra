'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { Locale } from '@/i18n/config';
import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/format';
import type { ConversationListItemDTO } from '@/types/ai';

type Props = {
  conversations: ConversationListItemDTO[] | undefined;
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
};

export function ChatSidebar({ conversations, loading, activeId, onSelect, onNew }: Props) {
  const t = useTranslations('chat');
  const locale = useLocale();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="border-b border-border p-3">
        <Button onClick={onNew} className="w-full justify-start gap-2" variant="secondary">
          <Plus className="h-4 w-4" />
          {t('newConversation')}
        </Button>
      </div>
      <div className="px-3 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('conversations')}</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-1">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
            <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
            <p>{t('noConversations')}</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    'flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left transition-colors',
                    activeId === c.id ? 'bg-muted' : 'hover:bg-muted/60'
                  )}
                >
                  <span className="line-clamp-1 text-sm font-medium text-foreground">{c.title}</span>
                  <span className="text-xs text-muted-foreground">{formatRelative(c.updatedAt, locale as Locale)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
