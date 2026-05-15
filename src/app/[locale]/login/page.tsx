import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/routing';
import { Sparkles } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  return { title: t('title') };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'login' });

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-heading text-lg font-bold text-primary">{t('appName')}</span>
          </Link>
          <CardTitle className="mt-4">{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/login-demo" method="post" className="space-y-3">
            <input type="hidden" name="locale" value={locale} />
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <Input id="email" name="email" type="email" placeholder={t('emailPlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('passwordLabel')}</Label>
              <Input id="password" name="password" type="password" placeholder={t('passwordPlaceholder')} />
            </div>
            <Button className="w-full" type="submit">
              {t('signInDemoButton')}
            </Button>
          </form>
          <div className="relative my-4 flex items-center gap-3">
            <hr className="flex-1 border-border" />
            <span className="text-xs text-muted-foreground">{t('divider')}</span>
            <hr className="flex-1 border-border" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" type="button">
              {t('signInWithGoogle')}
            </Button>
            <Button variant="secondary" type="button">
              {t('signInWithMicrosoft')}
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t('signUpPrompt')}{' '}
            <Link href="/onboarding" className="text-primary-accent hover:underline">
              {t('signUpLink')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
