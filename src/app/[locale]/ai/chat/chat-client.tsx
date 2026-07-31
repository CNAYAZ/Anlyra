'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ChatSidebar } from '@/components/ai/chat-sidebar';
import { ChatMessage } from '@/components/ai/chat-message';
import { ChatInput } from '@/components/ai/chat-input';
import { ChatEmpty } from '@/components/ai/chat-empty';
import { NoCredits } from '@/components/ai/no-credits';
import { TypingIndicator } from '@/components/ai/typing-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreditsStore } from '@/stores/credits-store';
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

export function ChatClient({ companyName, initialCredits }: Props) {
  const t = useTranslations('chat');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const credits = useCreditsStore((s) => s.credits);
  const setCredits = useCreditsStore((s) => s.setCredits);
  const [activeId, setActiveId] = useState<string | null>(null);
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
    mutationFn: async (vars: { conversationId: string | null; message: string }) =>
      fetchJson<SendMessageResponse>('/api/ai/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(vars),
      }),
    onSuccess: (res) => {
      setCredits(res.creditsRemaining);
      setActiveId(res.conversation.id);
      qc.setQueryData(['conversation', res.conversation.id], res.conversation);
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setPendingUser(null);
    },
    onError: () => {
      setPendingUser(null);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversationQuery.data, pendingUser, sendMutation.isPending]);

  function handleSend(text: string) {
    if (credits <= 0) return;
    setPendingUser(text);
    sendMutation.mutate({ conversationId: activeId, message: text });
  }

  function handleNew() {
    setActiveId(null);
    setPendingUser(null);
  }

  const messages: ChatMessageDTO[] = conversationQuery.data?.messages ?? [];
  const showEmpty = !activeId && !pendingUser && !sendMutation.isPending;
  const noCredits = credits <= 0;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ChatSidebar
        conversations={conversationsQuery.data}
        loading={conversationsQuery.isLoading}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
      />
      <section className="flex flex-1 flex-col">
        <div className="border-b border-border bg-card/40 px-6 py-3">
          <h1 className="font-heading text-base font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {noCredits && messages.length === 0 ? (
            <NoCredits />
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
              {messages.map((m) => (
                <ChatMessage key={m.id} role={m.role} content={m.content} />
              ))}
              {pendingUser && <ChatMessage role="USER" content={pendingUser} />}
              {sendMutation.isPending && (
                <div className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white">
                    <span className="text-xs">AI</span>
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-3">
                    <TypingIndicator />
                  </div>
                </div>
              )}
              {sendMutation.isError && (
                <p className="text-center text-sm text-danger">{t('errorSending')}</p>
              )}
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} disabled={noCredits || sendMutation.isPending} />
      </section>
    </div>
  );
}
