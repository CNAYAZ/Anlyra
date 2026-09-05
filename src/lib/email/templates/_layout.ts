import { companyFooterLine } from '@/lib/company';
import { escapeHtml, escapeMailtoAddress } from './_escape';

interface LayoutParams {
  title: string;
  preheader?: string;
  content: string;
  ctaButton?: { label: string; href: string };
  userEmail?: string;
}

/**
 * Shared skeleton for every template in this folder. `title`, `preheader`,
 * `ctaButton.label` and `userEmail` are always meant to be plain TEXT — no
 * caller in this codebase ever puts real markup in them — so they are escaped
 * HERE, once, rather than trusting all eleven templates to remember before
 * calling in. `content` is deliberately NOT escaped: it is the real HTML each
 * template builds (tables, the `<a>` tags for its own links), and every LEAF
 * value interpolated into it is that template's own job to escape — see
 * templates/_escape.ts.
 *
 * `ctaButton.href` is also left unescaped/unencoded on purpose: verified
 * every current caller builds it from `siteUrl()` plus a fixed path and
 * either a random token or a Stripe-hosted URL — never from user-typed text —
 * so there is nothing here for escapeHtml or a URL encoder to protect against
 * today. If a future caller ever builds an href from user text, that call
 * site needs its own encoding for the URL's structure (see escapeMailtoAddress
 * below for why HTML-escaping alone would not be enough), not a blanket
 * change here that would double-encode every legitimate URL.
 */
export function baseLayout(params: LayoutParams): string {
  const { title, preheader, content, ctaButton, userEmail } = params;
  const safeTitle = escapeHtml(title);
  const safePreheader = preheader !== undefined ? escapeHtml(preheader) : undefined;
  const safeCtaLabel = ctaButton ? escapeHtml(ctaButton.label) : undefined;

  const preheaderHtml = safePreheader
    ? `<div style="display:none;font-size:1px;color:#FBF6EE;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safePreheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`
    : '';

  const ctaHtml = ctaButton
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="${ctaButton.href}"
           style="display:inline-block;background-color:#5B6F4E;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.01em;">
          ${safeCtaLabel}
        </a>
      </div>`
    : '';

  // userEmail sits in TWO different contexts — a mailto: href and plain
  // visible text — and each needs its own treatment: escapeMailtoAddress for
  // the href (an address built from characters the weak email-format checks
  // at signup/invite allow through, like `?`/`&`/`=`, could otherwise smuggle
  // extra mailto parameters into the resolved link — see _escape.ts), plain
  // escapeHtml for the text so the address still reads normally.
  const footerEmail = userEmail
    ? `<p style="margin:4px 0 0;">Inviata a <a href="mailto:${escapeMailtoAddress(userEmail)}" style="color:#5B6F4E;text-decoration:none;">${escapeHtml(userEmail)}</a></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeTitle}</title>
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
