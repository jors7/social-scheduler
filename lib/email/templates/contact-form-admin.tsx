import { Text, Heading, Link } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface ContactFormAdminEmailProps {
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
}

export default function ContactFormAdminEmail({
  userName,
  userEmail,
  subject,
  message,
}: ContactFormAdminEmailProps) {
  return (
    <EmailLayout preview={`New contact from ${userName}: ${subject}`}>
      <Heading style={h1}>New Contact Form Submission</Heading>

      <Text style={text}>
        You have received a new message through the SocialCal contact form.
      </Text>

      {/* Contact Details Box */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={detailsBox}>
        <tr>
          <td style={detailsBoxInner}>
            <table width="100%" cellPadding="0" cellSpacing="0">
              <tr>
                <td style={labelCell}>Name:</td>
                <td style={valueCell}>{userName}</td>
              </tr>
              <tr>
                <td style={labelCell}>Email:</td>
                <td style={valueCell}>
                  <Link href={`mailto:${userEmail}`} style={emailLink}>
                    {userEmail}
                  </Link>
                </td>
              </tr>
              <tr>
                <td style={labelCell}>Subject:</td>
                <td style={valueCell}>{subject}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {/* Message Box */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={messageBox}>
        <tr>
          <td style={messageBoxInner}>
            <Text style={messageLabel}>Message:</Text>
            <Text style={messageText}>{message}</Text>
          </td>
        </tr>
      </table>

      <Text style={footerNote}>
        💡 Reply directly to this email to respond to {userName}
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

const detailsBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const detailsBoxInner = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  borderLeft: '4px solid #6366f1',
};

const labelCell = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600' as const,
  paddingBottom: '12px',
  paddingRight: '16px',
  verticalAlign: 'top' as const,
  width: '80px',
};

const valueCell = {
  color: '#1a1a1a',
  fontSize: '16px',
  paddingBottom: '12px',
  verticalAlign: 'top' as const,
};

const emailLink = {
  color: '#6366f1',
  textDecoration: 'underline',
};

const messageBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const messageBoxInner = {
  backgroundColor: '#ffffff',
  padding: '24px',
  border: '1px solid #e5e7eb',
};

const messageLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
};

const messageText = {
  color: '#1a1a1a',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 0',
  fontStyle: 'italic' as const,
};
