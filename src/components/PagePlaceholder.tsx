import { Construction, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PagePlaceholderProps {
  pageKey: string;
  icon?: LucideIcon;
}

export function PagePlaceholder({
  pageKey,
  icon: Icon = Construction,
}: PagePlaceholderProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t(`pages.${pageKey}.title`)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(`pages.${pageKey}.subtitle`)}
        </p>
      </header>

      <section className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card p-12 text-center shadow-card">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary-accent">
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold">
            {t('placeholder.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('placeholder.message')}
          </p>
        </div>
      </section>
    </div>
  );
}
