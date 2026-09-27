import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface OrgDeletionApprovalFounderParams {
  /** 'requested' — a request is now waiting; 'withdrawn' — the owner took it back before it was confirmed. */
  kind: 'requested' | 'withdrawn';
  orgName: string;
  orgId: string;
  requesterName: string;
  requesterEmail: string;
  /** Already formatted for display (Europe/Rome). */
  requestedAt: string;
  memberCount: number;
  /** Plain text, e.g. "PRO, active" or "nessun abbonamento". */
  subscription: string;
  /**
   * True when nobody asked for the company to go: its ONLY member asked to
   * delete their own personal account, which would otherwise leave an empty
   * company behind (see soleOwnershipOf in src/lib/gdpr/org-deletion.ts).
   */
  automatic: boolean;
  /** The inbox this goes to, shown in the footer like every other email. */
  inbox: string;
}

/**
 * Sent to the founder's inbox (COMPANY.contactEmail), never to a customer.
 * Italian only on purpose: its only reader is the founder.
 *
 * Every value that came from a user (company name, requester's name and
 * email) is escaped here — see _escape.ts and the rule in CLAUDE.md §7.
 */
export function orgDeletionApprovalFounderTemplate(params: OrgDeletionApprovalFounderParams): string {
  const {
    kind,
    orgName,
    orgId,
    requesterName,
    requesterEmail,
    requestedAt,
    memberCount,
    subscription,
    automatic,
    inbox,
  } = params;
  const safeOrgName = escapeHtml(orgName);

  const rows: [string, string][] = [
    ['Azienda', safeOrgName],
    ['ID azienda', escapeHtml(orgId)],
    ['Richiesta da', `${escapeHtml(requesterName)} &lt;${escapeHtml(requesterEmail)}&gt;`],
    ['Data della richiesta', escapeHtml(requestedAt)],
    ['Membri', String(memberCount)],
    ['Abbonamento', escapeHtml(subscription)],
  ];
  const table = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px;font-size:14px;color:#2A2520;">
      ${rows
        .map(
          ([k, v]) => `<tr>
        <td style="padding:6px 12px 6px 0;color:#6B6760;white-space:nowrap;vertical-align:top;">${k}</td>
        <td style="padding:6px 0;vertical-align:top;">${v}</td>
      </tr>`,
        )
        .join('')}
    </table>`;

  const content =
    kind === 'withdrawn'
      ? `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#2A2520;line-height:1.3;">
      Richiesta ritirata: ${safeOrgName}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      La richiesta di cancellare questa azienda è stata ritirata prima della tua conferma.
      Non devi fare nulla: è già sparita dal pannello admin.
    </p>
    ${table}
  `
      : `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#2A2520;line-height:1.3;">
      Da confermare: cancellazione di ${safeOrgName}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      ${
        automatic
          ? "L'unico membro di questa azienda ha chiesto la cancellazione del proprio account personale. Quella parte non dipende da te e parte da sola; resterebbe però un'azienda vuota, quindi la sua cancellazione è in attesa della tua conferma. L'abbonamento è già stato impostato per chiudersi a fine periodo."
          : "Il proprietario ha chiesto la cancellazione dell'azienda. Per ora non è cambiato niente: nessun dato è stato cancellato o bloccato."
      }
    </p>
    ${table}
    <p style="margin:0 0 12px;font-size:15px;color:#6B6760;">
      Per confermare o rifiutare: pannello admin (<code>npm run admin</code>), scheda
      <strong style="color:#2A2520;">Cancellazioni</strong>. La conferma fa partire i 30 giorni,
      avvisa i membri e chiude l'abbonamento a fine periodo.
    </p>
    <p style="margin:0 0 12px;font-size:15px;color:#6B6760;">
      Per legge hai un mese di tempo dalla data della richiesta per rispondere.
    </p>
  `;

  return baseLayout({
    title:
      kind === 'withdrawn'
        ? `Richiesta ritirata: ${orgName} · Anlyra`
        : `Da confermare: cancellazione di ${orgName} · Anlyra`,
    preheader:
      kind === 'withdrawn'
        ? `La richiesta di cancellare ${orgName} è stata ritirata. Nessuna azione necessaria.`
        : `Richiesta di cancellazione di ${orgName} in attesa della tua conferma dal pannello admin.`,
    content,
    userEmail: inbox,
    locale: 'it',
  });
}
