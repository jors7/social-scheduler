import { Resend } from 'resend';

// Lazy initialization - only create Resend client when actually used
let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export const EMAIL_FROM = process.env.EMAIL_FROM || 'SocialCal <noreply@socialcal.app>';
export const REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@socialcal.app';
