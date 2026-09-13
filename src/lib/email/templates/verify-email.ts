import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface VerifyEmailParams {
  userName: string;
  userEmail: string;
  verifyUrl: string;
  expiryHours: number;
  locale?: 'it' | 'en';
}

export function verifyEmailTemplate(params: VerifyEmailParams): string {
  const { userName, userEmail, verifyUrl, expiryHours, locale = 'it' } = params;
  const safeUserName = escapeHtml(userName);
  const isEn = locale === 'en';

  const content = isEn ? `
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Confirm your email address
    </h1>
    <p style="margin:0 0 16px;color:#2A2520;">
      Hi ${safeUserName}, to finish creating your Anlyra account we need to verify your email address.
    </p>
    <p style="margin:0 0 24px;color:#2A2520;">
      Click the button below to confirm this address belongs to you.
    </p>

    <!-- Expiry note -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#F9F4EB;border:1px solid #E8DFD0;border-radius:8px;padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#6B6760;">
            <strong style="color:#2A2520;">Heads up:</strong> this verification link expires in
            <strong style="color:#2A2520;">${expiryHours} hours</strong>.
            After that you'll need to request a new one.
          </p>
        </td>
      </tr>
    </table>

    <!-- Fallback link -->
    <p style="margin:16px 0 0;font-size:13px;color:#6B6760;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin:4px 0 0;font-size:12px;word-break:break-all;">
      <a href="${verifyUrl}" style="color:#5B6F4E;text-decoration:underline;">${verifyUrl}</a>
    </p>

    <!-- Disclaimer -->
    <p style="margin:24px 0 0;padding:16px;background-color:#FFF8F0;border-left:3px solid #E8DFD0;border-radius:0 4px 4px 0;font-size:13px;color:#6B6760;">
      If you didn't create an Anlyra account, you can safely ignore this email. Your address won't be used for anything.
    </p>
  ` : `
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Conferma il tuo indirizzo email
    </h1>
    <p style="margin:0 0 16px;color:#2A2520;">
      Ciao ${safeUserName}, per completare la registrazione su Anlyra è necessario verificare il tuo indirizzo email.
    </p>
    <p style="margin:0 0 24px;color:#2A2520;">
      Clicca il pulsante qui sotto per confermare che questo indirizzo ti appartiene.
    </p>

    <!-- Expiry note -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#F9F4EB;border:1px solid #E8DFD0;border-radius:8px;padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#6B6760;">
            <strong style="color:#2A2520;">Attenzione:</strong> il link di verifica scade tra
            <strong style="color:#2A2520;">${expiryHours} ore</strong>.
            Dopo la scadenza dovrai richiederne uno nuovo.
          </p>
        </td>
      </tr>
    </table>

    <!-- Fallback link -->
    <p style="margin:16px 0 0;font-size:13px;color:#6B6760;">
      Se il pulsante non funziona, copia e incolla questo link nel browser:
    </p>
    <p style="margin:4px 0 0;font-size:12px;word-break:break-all;">
      <a href="${verifyUrl}" style="color:#5B6F4E;text-decoration:underline;">${verifyUrl}</a>
    </p>

    <!-- Disclaimer -->
    <p style="margin:24px 0 0;padding:16px;background-color:#FFF8F0;border-left:3px solid #E8DFD0;border-radius:0 4px 4px 0;font-size:13px;color:#6B6760;">
      Se non hai creato un account su Anlyra, puoi ignorare questa email in tutta sicurezza. Il tuo indirizzo non verrà utilizzato.
    </p>
  `;

  return baseLayout({
    title: isEn ? 'Confirm your email address — Anlyra' : 'Conferma il tuo indirizzo email — Anlyra',
    preheader: isEn
      ? `Verify your email address to start using Anlyra. Link valid for ${expiryHours} hours.`
      : `Verifica il tuo indirizzo email per iniziare a usare Anlyra. Link valido per ${expiryHours} ore.`,
    content,
    ctaButton: { label: isEn ? 'Confirm your email address' : 'Conferma il tuo indirizzo email', href: verifyUrl },
    userEmail,
    locale,
  });
}
