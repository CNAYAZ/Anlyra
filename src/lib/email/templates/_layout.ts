import { companyFooterLine } from '@/lib/company';

interface LayoutParams {
  title: string;
  preheader?: string;
  content: string;
  ctaButton?: { label: string; href: string };
  userEmail?: string;
}

export function baseLayout(params: LayoutParams): string {
  const { title, preheader, content, ctaButton, userEmail } = params;

  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#FBF6EE;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`
    : '';

  const ctaHtml = ctaButton
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="${ctaButton.href}"
           style="display:inline-block;background-color:#5B6F4E;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.01em;">
          ${ctaButton.label}
        </a>
      </div>`
    : '';

  const footerEmail = userEmail
    ? `<p style="margin:4px 0 0;">Inviata a <a href="mailto:${userEmail}" style="color:#5B6F4E;text-decoration:none;">${userEmail}</a></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F9F4EB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  ${preheaderHtml}

  <!-- Wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F9F4EB;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"
               style="max-width:600px;width:100%;background-color:#FBF6EE;border-radius:12px;border:1px solid #E8DFD0;overflow:hidden;">

          <!-- Header / Logo -->
          <tr>
            <td style="background-color:#5B6F4E;padding:24px 32px;">
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;font-weight:700;color:#F9F4EB;letter-spacing:-0.02em;">
                Anlyra
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <div style="font-size:15px;line-height:1.65;color:#2A2520;">
                ${content}
              </div>
              ${ctaHtml}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #E8DFD0;margin:16px 0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6B6760;">
                ${companyFooterLine()}
              </p>
              ${footerEmail}
              <p style="margin:8px 0 0;font-size:12px;color:#6B6760;">
                <a href="#" style="color:#5B6F4E;text-decoration:underline;">Gestisci preferenze email</a>
                &nbsp;·&nbsp;
                <a href="#" style="color:#5B6F4E;text-decoration:underline;">Annulla iscrizione</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>`;
}
