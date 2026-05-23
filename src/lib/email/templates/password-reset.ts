import { baseLayout } from './_layout';

interface PasswordResetParams {
  userName: string;
  userEmail: string;
  resetUrl: string;
  expiryMinutes: number;
  ipAddress?: string;
  userAgent?: string;
}

export function passwordResetTemplate(params: PasswordResetParams): string {
  const { userName, userEmail, resetUrl, expiryMinutes, ipAddress, userAgent } = params;

  const securityNote =
    ipAddress || userAgent
      ? `<p style="margin:8px 0 0;font-size:12px;color:#6B6760;">
          Richiesto da: ${ipAddress ? `<strong>${ipAddress}</strong>` : ''}${ipAddress && userAgent ? ' · ' : ''}${userAgent ? userAgent : ''}
        </p>`
      : '';

  const content = `
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Reimposta la tua password
    </h1>
    <p style="margin:0 0 16px;color:#2A2520;">
      Ciao ${userName}, abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account Anlyra.
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
      Se noti attività sospette, <a href="mailto:hello@anlyra.it" style="color:#5B6F4E;">contattaci subito</a>.
    </p>
  `;

  return baseLayout({
    title: 'Reimposta la tua password — Anlyra',
    preheader: `Hai richiesto il reset della password. Il link è valido per ${expiryMinutes} minuti.`,
    content,
    ctaButton: { label: 'Reimposta password', href: resetUrl },
    userEmail,
  });
}
