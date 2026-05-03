import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}

export function Section({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('card', className)}>
      {(title || description) && (
        <header className="mb-4">
          {title && (
            <h2 className="text-base font-heading font-semibold text-slate-800">
              {title}
            </h2>
          )}
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
