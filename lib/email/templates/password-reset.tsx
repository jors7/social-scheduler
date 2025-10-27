import { Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface PasswordResetEmailProps {
  resetLink: string;
}

export default function PasswordResetEmail({
  resetLink
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your SocialCal password">
      <Heading style={h1}>Reset Your Password</Heading>

      <Text style={text}>
        We received a request to reset the password for your SocialCal account.
      </Text>

      <Text style={text}>
        Click the button below to choose a new password:
      </Text>

      <Button style={button} href={resetLink}>
        Reset Password
      </Button>

      <table width="100%" cellPadding="0" cellSpacing="0" style={infoBox}>
        <tr>
          <td style={infoBoxInner}>
            <Text style={infoTitle}>Important Information:</Text>
            <Text style={infoText}>
              • This link will expire in 1 hour for security<br />
              • The link can only be used once<br />
              • If you didn&apos;t request this, you can safely ignore this email
            </Text>
          </td>
        </tr>
      </table>

      <Text style={footnote}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
      </Text>

      <Text style={linkText}>
        {resetLink}
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={securityBox}>
        <tr>
          <td style={securityBoxInner}>
            <Text style={securityText}>
              = <strong>Security reminder:</strong> Never share your password or reset link with anyone. SocialCal staff will never ask for your password.
            </Text>
          </td>
        </tr>
      </table>

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

const infoBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const infoBoxInner = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  borderLeft: '4px solid #6366f1',
};

const infoTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
};

const infoText = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const footnote = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '32px 0 8px',
};

const linkText = {
  color: '#6366f1',
  fontSize: '13px',
  wordBreak: 'break-all' as const,
  margin: '0 0 24px',
};

const securityBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const securityBoxInner = {
  backgroundColor: '#fef3c7',
  padding: '16px',
  borderLeft: '4px solid #f59e0b',
};

const securityText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const signature = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 0',
};
