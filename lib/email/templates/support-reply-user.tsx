import { Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface SupportReplyUserEmailProps {
  userName: string;
  subject: string;
  replyMessage: string;
  adminName: string;
}

export default function SupportReplyUserEmail({
  userName,
  subject,
  replyMessage,
  adminName,
}: SupportReplyUserEmailProps) {
  const dashboardUrl = 'https://www.socialcal.app/dashboard';

  return (
    <EmailLayout preview={`Re: ${subject} - SocialCal Support`}>
      <Heading style={h1}>You have a new reply</Heading>

      <Text style={text}>
        Hi {userName},
      </Text>

      <Text style={text}>
        Our support team has replied to your message about &quot;{subject}&quot;.
      </Text>

      {/* Reply Box */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={replyBox}>
        <tr>
          <td style={replyBoxInner}>
            <Text style={replyHeader}>
              {adminName} from SocialCal Support:
            </Text>
            <Text style={replyText}>{replyMessage}</Text>
          </td>
        </tr>
      </table>

      <Text style={text}>
        You can reply to this message directly from your dashboard.
      </Text>

      {/* CTA Button */}
      <table width="100%" cellPadding="0" cellSpacing="0">
        <tr>
          <td align="center" style={{ padding: '24px 0' }}>
            <Button href={dashboardUrl} style={button}>
              View Conversation
            </Button>
          </td>
        </tr>
      </table>

      <Text style={footerNote}>
        Click the help icon in your dashboard to continue the conversation.
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

const replyBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const replyBoxInner = {
  backgroundColor: '#f0fdf4',
  padding: '24px',
  borderLeft: '4px solid #22c55e',
};

const replyHeader = {
  color: '#166534',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
};

const replyText = {
  color: '#1a1a1a',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 0',
  fontStyle: 'italic' as const,
};
