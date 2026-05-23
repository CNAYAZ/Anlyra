import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn('[email] RESEND_API_KEY not set — email sending disabled');
}

export const resend = apiKey ? new Resend(apiKey) : null;

export function isEmailEnabled(): boolean {
  return resend !== null;
}
