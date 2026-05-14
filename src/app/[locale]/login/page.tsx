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
  const t = await getTranslations({ locale, namespace: 'common' });
  return { title: t('login') };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'common' });

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
          <CardTitle className="mt-4">{t('login')}</CardTitle>
          <CardDescription>{t('loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" placeholder="you@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" type="password" />
            </div>
            <Button className="w-full" type="button" asChild>
              <Link href="/">{t('login')}</Link>
            </Button>
          </form>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" type="button">
              Google
            </Button>
            <Button variant="secondary" type="button">
              Microsoft
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t('newHere')}{' '}
            <Link href="/onboarding" className="text-primary-accent hover:underline">
              {t('freeStart')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
