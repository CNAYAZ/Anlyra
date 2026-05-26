import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import AcceptInviteButton from './AcceptInviteButton';

const COPY = {
  it: {
    expiredTitle: 'Invito non valido',
    expiredBody: 'Questo invito è scaduto o è già stato usato. Chiedi un nuovo invito al tuo team.',
    mismatchTitle: 'Email diversa',
    mismatchBody: (email: string) => `Questo invito è per ${email}. Accedi con quell’indirizzo per accettarlo.`,
    inviteTitle: (org: string) => `Unisciti a ${org}`,
    inviteBody: (role: string) => `Sei stato invitato a collaborare come ${role}.`,
  },
  en: {
    expiredTitle: 'Invalid invite',
    expiredBody: 'This invite has expired or was already used. Ask your team for a new one.',
    mismatchTitle: 'Different email',
    mismatchBody: (email: string) => `This invite is for ${email}. Sign in with that address to accept it.`,
    inviteTitle: (org: string) => `Join ${org}`,
    inviteBody: (role: string) => `You’ve been invited to collaborate as ${role}.`,
  },
} as const;

function Shell({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <CardTitle className="mt-3">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && <CardContent className="text-center">{children}</CardContent>}
      </Card>
    </main>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = COPY[locale === 'en' ? 'en' : 'it'];

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return <Shell title={t.expiredTitle} description={t.expiredBody} />;
  }

  const session = await auth();
  const userEmail = session?.user?.email?.toLowerCase();

  if (!userEmail) {
    // Not signed in → send to signup with the invited email prefilled context.
    redirect(`/${locale}/signup?invite=${token}`);
  }

  if (userEmail !== invite.email.toLowerCase()) {
    return <Shell title={t.mismatchTitle} description={t.mismatchBody(invite.email)} />;
  }

  return (
    <Shell title={t.inviteTitle(invite.organization.name)} description={t.inviteBody(invite.role)}>
      <AcceptInviteButton token={token} locale={locale === 'en' ? 'en' : 'it'} />
    </Shell>
  );
}
