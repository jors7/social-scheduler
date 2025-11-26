import { Text, Heading } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface ContactFormConfirmationEmailProps {
  userName: string;
  subject: string;
}

export default function ContactFormConfirmationEmail({
  userName,
  subject,
}: ContactFormConfirmationEmailProps) {
  return (
    <EmailLayout preview="Thank you for contacting SocialCal">
      <Heading style={h1}>Thank You for Contacting Us</Heading>

      <Text style={text}>Hi {userName},</Text>

      <Text style={text}>
        Thank you for reaching out to SocialCal! We&apos;ve received your message and our team will get back to you as soon as possible.
      </Text>

      {/* Subject Reminder Box */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={subjectBox}>
        <tr>
          <td style={subjectBoxInner}>
            <Text style={subjectLabel}>Your Message Subject:</Text>
            <Text style={subjectText}>{subject}</Text>
          </td>
        </tr>
      </table>

      <Text style={text}>
        We typically respond to all inquiries within <strong>24 hours</strong> during business days. You&apos;ll hear from us at the email address you provided.
      </Text>

      {/* Contact Info Box */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={infoBox}>
        <tr>
          <td style={infoBoxInner}>
            <Text style={infoTitle}>Need immediate assistance?</Text>
            <Text style={infoText}>
              For urgent matters, you can reach us directly at{' '}
              <a href="mailto:jan@socialcal.app" style={emailLink}>
                jan@socialcal.app
              </a>
            </Text>
          </td>
        </tr>
      </table>

      <Text style={text}>
        We appreciate you choosing SocialCal for your social media scheduling needs!
      </Text>

      <Text style={signature}>
        Best regards,<br />
        The SocialCal Team
      </Text>
    </EmailLayout>
  );
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: '700' as const,
  margin: '0 0 24px',
  lineHeight: '1.25',
  letterSpacing: '-0.5px',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px',
};

const subjectBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const subjectBoxInner = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderLeft: '4px solid #6366f1',
};

const subjectLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
};

const subjectText = {
  color: '#1a1a1a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  fontWeight: '500' as const,
};

const infoBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const infoBoxInner = {
  backgroundColor: '#eff6ff',
  padding: '20px',
  borderLeft: '4px solid #3b82f6',
};

const infoTitle = {
  color: '#1e40af',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
};

const infoText = {
  color: '#1e3a8a',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const emailLink = {
  color: '#2563eb',
  textDecoration: 'underline',
  fontWeight: '500' as const,
};

const signature = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
