import { Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface EmailConfirmationProps {
  confirmationLink: string;
}

export default function EmailConfirmationEmail({
  confirmationLink
}: EmailConfirmationProps) {
  return (
    <EmailLayout preview="Confirm your email address">
      <Heading style={h1}>Welcome to SocialCal! =K</Heading>

      <Text style={text}>
        Thanks for signing up! We&apos;re excited to have you on board.
      </Text>

      <Text style={text}>
        To get started, please confirm your email address by clicking the button below:
      </Text>

      <Button style={button} href={confirmationLink}>
        Confirm Email Address
      </Button>

      <table width="100%" cellPadding="0" cellSpacing="0" style={welcomeBox}>
        <tr>
          <td style={welcomeBoxInner}>
            <Text style={welcomeTitle}>What&apos;s Next?</Text>
            <Text style={welcomeText}>
              After confirming your email, you&apos;ll be able to:<br /><br />
               Connect your social media accounts<br />
               Schedule posts across multiple platforms<br />
               Generate AI-powered captions<br />
               Track your social media performance
            </Text>
          </td>
        </tr>
      </table>

      <Text style={footnote}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
      </Text>

      <Text style={linkText}>
        {confirmationLink}
      </Text>

      <Text style={footnote}>
        This link will expire in 24 hours. If you didn&apos;t create an account with SocialCal, you can safely ignore this email.
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

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '16px 32px',
  margin: '32px 0',
};

const welcomeBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const welcomeBoxInner = {
  backgroundColor: '#ede9fe',
  padding: '24px',
  borderLeft: '4px solid #6366f1',
};

const welcomeTitle = {
  color: '#4f46e5',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
};

const welcomeText = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const footnote = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 8px',
};

const linkText = {
  color: '#6366f1',
  fontSize: '13px',
  wordBreak: 'break-all' as const,
  margin: '0 0 24px',
};

const signature = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 0',
};
