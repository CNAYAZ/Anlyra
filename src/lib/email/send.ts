import { resend, isEmailEnabled } from './client';
import { COMPANY } from '@/lib/company';

/**
 * One file attachment. Mirrors the shape Resend's SDK accepts (content as a
 * Buffer, filename including the extension) rather than re-declaring it, so a
 * future SDK type change surfaces here as a compile error instead of silently
 * drifting.
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

/**
 * Resend's hard cap is 40MB for the WHOLE request (HTML + all attachments
 * combined), not per-file. Kept here — not in the caller — so every caller
 * shares one enforced limit instead of each guessing its own threshold.
 * Set comfortably under 40MB to leave room for the HTML body and headers.
 */
export const MAX_EMAIL_ATTACHMENT_BYTES = 35 * 1024 * 1024;

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  /**
   * Optional — every existing call site omits this and behaves exactly as
   * before. Rejected client-side (before the Resend call) if the total exceeds
   * MAX_EMAIL_ATTACHMENT_BYTES, so an oversized PDF fails with a clear error
   * instead of an opaque Resend 4xx.
   */
  attachments?: EmailAttachment[];
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

const DEFAULT_FROM = process.env.RESEND_FROM || `Anlyra <${COMPANY.noreplyEmail}>`;

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!isEmailEnabled() || !resend) {
    console.warn('[email] send skipped — email disabled', { to: params.to, subject: params.subject });
    return { success: false, error: 'EMAIL_DISABLED' };
  }

  if (params.attachments?.length) {
    const totalBytes = params.attachments.reduce((sum, a) => sum + a.content.length, 0);
    if (totalBytes > MAX_EMAIL_ATTACHMENT_BYTES) {
      console.error('[email] send skipped — attachments exceed size limit', {
        to: params.to,
        subject: params.subject,
        totalBytes,
        limit: MAX_EMAIL_ATTACHMENT_BYTES,
      });
      return { success: false, error: 'ATTACHMENT_TOO_LARGE' };
    }
  }

  try {
    const result = await resend.emails.send({
      from: params.from || DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
      attachments: params.attachments,
    });

    if (result.error) {
      console.error('[email] send failed', { error: result.error, to: params.to });
      return { success: false, error: result.error.message };
    }

    console.info('[email] sent', { id: result.data?.id, to: params.to, subject: params.subject });
    return { success: true, id: result.data?.id };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'UNKNOWN';
    console.error('[email] exception', { error, to: params.to });
    return { success: false, error };
  }
}
