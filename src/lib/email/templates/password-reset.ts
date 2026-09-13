import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';
import { COMPANY } from '@/lib/company';

interface PasswordResetParams {
  userName: string;
  userEmail: string;
  resetUrl: string;
  expiryMinutes: number;
  ipAddress?: string;
  userAgent?: string;
  locale?: 'it' | 'en';
}

export function passwordResetTemplate(params: PasswordResetParams): string {
  const { userName, userEmail, resetUrl, expiryMinutes, ipAddress, userAgent, locale = 'it' } = params;
  const safeUserName = escapeHtml(userName);
  const isEn = locale === 'en';
  // No current caller supplies ipAddress/userAgent (verified: neither
  // forgot-password/route.ts nor any other caller passes them), so this block
  // is dead in practice today. Escaped anyway: both are values read from HTTP
  // headers (X-Forwarded-For, User-Agent), which a client fully controls —
  // the same "cannot be trusted as plain HTML" reasoning as any user-typed
  // field, the moment a future caller wires them in.
  const safeIpAddress = ipAddress ? escapeHtml(ipAddress) : undefined;
  const safeUserAgent = userAgent ? escapeHtml(userAgent) : undefined;

  const securityNote =
    safeIpAddress || safeUserAgent
      ? `<p style="margin:8px 0 0;font-size:12px;color:#6B6760;">
          ${isEn ? 'Requested from' : 'Richiesto da'}: ${safeIpAddress ? `<strong>${safeIpAddress}</strong>` : ''}${safeIpAddress && safeUserAgent ? ' · ' : ''}${safeUserAgent ? safeUserAgent : ''}
        </p>`
      : '';

  const content = isEn ? `
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Reset your password
    </h1>
    <p style="margin:0 0 16px;color:#2A2520;">
      Hi ${safeUserName}, we received a request to reset the password for your Anlyra account.
    </p>
    <p style="margin:0 0 24px;color:#2A2520;">
      Click the button below to choose a new password. If you didn't request this, you can ignore this email.
    </p>

    <!-- Expiry note -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#F9F4EB;border:1px solid #E8DFD0;border-radius:8px;padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#6B6760;">
            <strong style="color:#2A2520;">This link expires in ${expiryMinutes} minutes.</strong>
            After that you'll need to request a new reset link.
          </p>
          ${securityNote}
        </td>
      </tr>
    </table>

    <!-- Fallback link -->
    <p style="margin:16px 0 0;font-size:13px;color:#6B6760;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin:4px 0 0;font-size:12px;word-break:break-all;">
      <a href="${resetUrl}" style="color:#5B6F4E;text-decoration:underline;">${resetUrl}</a>
    </p>

    <!-- Security disclaimer -->
    <p style="margin:24px 0 0;padding:16px;background-color:#FFF8F0;border-left:3px solid #E8DFD0;border-radius:0 4px 4px 0;font-size:13px;color:#6B6760;">
      <strong style="color:#2A2520;">Didn't request this reset?</strong>
      Your current password is still valid and your account is safe. You can ignore this email.
      If you notice anything suspicious, <a href="mailto:${COMPANY.contactEmail}" style="color:#5B6F4E;">contact us right away</a>.
    </p>
  ` : `
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Reimposta la tua password
    </h1>
    <p style="margin:0 0 16px;color:#2A2520;">
      Ciao ${safeUserName}, abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account Anlyra.
    </p>
    <p style="margin:0 0 24px;color:#2A2520;">
      Clicca il pulsante qui sotto per scegliere una nuova password. Se non sei stato tu a farne richiesta, puoi ignorare questa email.
    </p>

    <!-- Expiry note -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#F9F4EB;border:1px solid #E8DFD0;border-radius:8px;padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#6B6760;">
            <strong style="color:#2A2520;">Il link scade tra ${expiryMinutes} minuti.</strong>
            Dopo la scadenza dovrai richiedere un nuovo link di reset.
          </p>
          ${securityNote}
        </td>
      </tr>
    </table>

    <!-- Fallback link -->
    <p style="margin:16px 0 0;font-size:13px;color:#6B6760;">
      Se il pulsante non funziona, copia e incolla questo link nel browser:
    </p>
    <p style="margin:4px 0 0;font-size:12px;word-break:break-all;">
      <a href="${resetUrl}" style="color:#5B6F4E;text-decoration:underline;">${resetUrl}</a>
    </p>

    <!-- Security disclaimer -->
    <p style="margin:24px 0 0;padding:16px;background-color:#FFF8F0;border-left:3px solid #E8DFD0;border-radius:0 4px 4px 0;font-size:13px;color:#6B6760;">
      <strong style="color:#2A2520;">Non hai richiesto questo reset?</strong>
      La tua password attuale rimane valida e il tuo account è al sicuro. Puoi ignorare questa email.
      Se noti attività sospette, <a href="mailto:${COMPANY.contactEmail}" style="color:#5B6F4E;">contattaci subito</a>.
    </p>
  `;

  return baseLayout({
    title: isEn ? 'Reset your password — Anlyra' : 'Reimposta la tua password — Anlyra',
    preheader: isEn
      ? `You requested a password reset. The link is valid for ${expiryMinutes} minutes.`
      : `Hai richiesto il reset della password. Il link è valido per ${expiryMinutes} minuti.`,
    content,
    ctaButton: { label: isEn ? 'Reset password' : 'Reimposta password', href: resetUrl },
    userEmail,
    locale,
  });
}
