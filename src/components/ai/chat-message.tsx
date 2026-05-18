import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  role: string;
  content: string;
};

export function ChatMessage({ role, content }: Props) {
  const isUser = role === 'USER';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full',
          isUser ? 'bg-primary-accent text-white' : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[78%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-primary-accent text-white rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        )}
      >
        {content}
      </div>
    </div>
  );
}
