import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { validatePassword, PASSWORD_POLICY } from '@/lib/auth/config';
import { issueVerificationEmail } from '@/lib/auth/verification';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';
import { hasControlChars } from '@/lib/validation/display-name';
import { auditLog } from '@/lib/audit/log';


export async function POST(req: Request) {
  const ipLimit = await checkRateLimit('register-ip', getClientIp(req));
  if (!ipLimit.success) return authRateLimitResponse(ipLimit);

  let body: {
    name?: string;
    email?: string;
    password?: string;
    locale?: string;
    termsAccepted?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  // ── ACCETTAZIONE DI PRIVACY E TERMINI + MAGGIORE ETÀ ──
  // Prima di ogni altro controllo, e prima di guardare se l'email esiste già:
  // senza dichiarazione non si apre un account, e la risposta non dice nulla su
  // quell'indirizzo (la rotta altrove risponde "CHECK_EMAIL" anche a un'email
  // già registrata, proprio per non rivelare chi è iscritto).
  // Solo il valore booleano true passa: una stringa "true", un 1 o un oggetto
  // non sono una dichiarazione consapevole, sono un client che tira a indovinare.
  if (body.termsAccepted !== true) {
    return NextResponse.json({ error: 'TERMS_NOT_ACCEPTED' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const locale = body.locale === 'en' ? 'en' : 'it';

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
  }
  // No schema previously validated this at all — unlike settings/profile's
  // PATCH (same User.name column, z.string().min(1).max(100)), this route had
  // no length cap and no character filter. Matching that route's cap here,
  // plus the control-character rule shared with it: this name can later be
  // shown to OTHER people (e.g. as the inviter's name in a team-invite email),
  // not just to the person who typed it.
  if (name.length > 100 || hasControlChars(name)) {
    return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 });
  }
  if (!validatePassword(password)) {
    return NextResponse.json(
      { error: 'WEAK_PASSWORD', message: PASSWORD_POLICY.describe },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Do not leak which emails exist; respond as success with neutral message.
    return NextResponse.json({ success: true, message: 'CHECK_EMAIL' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, name: name || null, locale, passwordHash },
  });

  // ── LA PROVA CHE HA ACCETTATO, E QUANDO ──
  // Registrata nell'audit log, che è l'unico posto durevole disponibile senza
  // aggiungere una colonna: `userId` dice CHI, `createdAt` dice QUANDO, `ip`
  // dice DA DOVE.
  // ATTENZIONE: questa riga è una prova contrattuale, non un log di sicurezza.
  // Qualunque regola di conservazione che cancelli righe di audit per anzianità
  // DEVE saltare questa azione, altrimenti la prova sparisce da sola.
  // Quello che NON viene registrato è QUALE versione dei documenti è stata
  // accettata: servirebbe un numero di versione dei testi legali, e quello è
  // una decisione del fondatore (vedi il rapporto della sessione).
  await auditLog({
    action: 'auth.terms_accepted',
    userId: user.id,
    req,
    metadata: { ageConfirmed: true, locale },
  });

  // Same token generation, expiry (24h) and email template as a later resend
  // (see /api/auth/resend-verification) — one shared function, not two copies.
  await issueVerificationEmail(user);

  return NextResponse.json({ success: true, message: 'CHECK_EMAIL' });
}
