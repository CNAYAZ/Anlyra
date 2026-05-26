import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/routing';
import { Sparkles, ArrowRight } from 'lucide-react';
import { auth } from '@/auth';

const COPY = {
  it: {
    title: (name: string) => `Benvenuto su Anlyra, ${name}!`,
    subtitle: 'Il tuo account è attivo. Configuriamo la tua organizzazione.',
    cta: 'Inizia il setup',
    note: 'Bastano 2 minuti. Potrai modificare tutto in seguito.',
  },
  en: {
    title: (name: string) => `Welcome to Anlyra, ${name}!`,
    subtitle: 'Your account is active. Let’s set up your organization.',
    cta: 'Start setup',
    note: 'It takes 2 minutes. You can change everything later.',
  },
} as const;

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = COPY[locale === 'en' ? 'en' : 'it'];

  const session = await auth();
  const name = session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'team';

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary">
            <Sparkles className="h-6 w-6 text-primary" />
          </span>
          <CardTitle className="mt-3">{t.title(name)}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link
            href="/onboarding/organization"
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-sage-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-600 dark:bg-sage-400 dark:text-[hsl(30_6%_10%)] dark:hover:bg-sage-300"
          >
            {t.cta} <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">{t.note}</p>
        </CardContent>
      </Card>
    </main>
  );
}
