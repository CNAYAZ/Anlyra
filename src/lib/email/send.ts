import { resend, isEmailEnabled } from './client';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

const DEFAULT_FROM = process.env.RESEND_FROM || 'Anlyra <noreply@anlyra.com>';

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!isEmailEnabled() || !resend) {
    console.warn('[email] send skipped — email disabled', { to: params.to, subject: params.subject });
    return { success: false, error: 'EMAIL_DISABLED' };
  }

  try {
    const result = await resend.emails.send({
      from: params.from || DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
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
