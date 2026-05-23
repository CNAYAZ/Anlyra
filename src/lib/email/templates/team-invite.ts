import { baseLayout } from './_layout';

interface TeamInviteParams {
  inviterName: string;
  inviterEmail: string;
  orgName: string;
  userEmail: string;
  inviteUrl: string;
  expiryHours: number;
}

export function teamInviteTemplate(params: TeamInviteParams): string {
  const { inviterName, inviterEmail, orgName, userEmail, inviteUrl, expiryHours } = params;

  const content = `
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Sei stato invitato a unirti a ${orgName}
    </h1>
    <p style="margin:0 0 16px;color:#2A2520;">
      <strong>${inviterName}</strong>
      (<a href="mailto:${inviterEmail}" style="color:#5B6F4E;text-decoration:none;">${inviterEmail}</a>)
      ti ha invitato a collaborare su <strong>${orgName}</strong> usando Anlyra.
    </p>

    <!-- What is Anlyra -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#F9F4EB;border:1px solid #E8DFD0;border-radius:8px;padding:16px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#2A2520;">Cos'è Anlyra?</p>
          <p style="margin:0;font-size:13px;color:#6B6760;line-height:1.6;">
            Anlyra è la piattaforma di business intelligence per PMI italiane: dashboard finanziarie, AI insights e analisi competitive — tutto in un unico posto, facile da usare.
          </p>
        </td>
      </tr>
    </table>

    <!-- Expiry note -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:10px 16px;border:1px solid #E8DFD0;border-radius:8px;">
          <p style="margin:0;font-size:13px;color:#6B6760;">
            L'invito è valido per <strong style="color:#2A2520;">${expiryHours} ore</strong>.
            Dopo la scadenza ${inviterName} dovrà inviarne uno nuovo.
          </p>
        </td>
      </tr>
    </table>

    <!-- Fallback link -->
    <p style="margin:16px 0 0;font-size:13px;color:#6B6760;">
      Se il pulsante non funziona, copia e incolla questo link nel browser:
    </p>
    <p style="margin:4px 0 0;font-size:12px;word-break:break-all;">
      <a href="${inviteUrl}" style="color:#5B6F4E;text-decoration:underline;">${inviteUrl}</a>
    </p>

    <p style="margin:24px 0 0;font-size:13px;color:#6B6760;">
      Se non conosci ${inviterName} o non ti aspettavi questo invito, puoi ignorare questa email in tutta sicurezza.
    </p>
  `;

  return baseLayout({
    title: `${inviterName} ti ha invitato a ${orgName} su Anlyra`,
    preheader: `${inviterName} ti ha invitato a collaborare su ${orgName}. Accetta l'invito entro ${expiryHours} ore.`,
    content,
    ctaButton: { label: "Accetta l'invito", href: inviteUrl },
    userEmail,
  });
}
