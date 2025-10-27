import { Text, Heading, Button, Section } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface ResetPasswordEmailProps {
  resetLink: string;
}

export default function ResetPasswordEmail({ resetLink }: ResetPasswordEmailProps) {
  return (
    <EmailLayout preview="Reset your SocialCal password">
      <Heading style={h1}>Reset Your Password</Heading>

      <Text style={text}>
        We received a request to reset your SocialCal password. Click the button below to create a new password.
      </Text>

      <Button style={button} href={resetLink}>
        Reset Password
      </Button>

      <Section style={infoBox}>
        <Text style={infoText}>
          ⏰ This link will expire in 1 hour for security reasons.
        </Text>
      </Section>

      <Text style={text}>
        If you didn&apos;t request a password reset, please ignore this email or contact support if you have concerns about your account security.
      </Text>

      <Text style={text}>
        For your security, this link can only be used once and will expire after 1 hour.
      </Text>
    </EmailLayout>
  );
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  lineHeight: '1.3',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const button = {
  backgroundColor: '#1a1a1a',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
  margin: '24px 0',
};

const infoBox = {
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#fff7ed',
  borderRadius: '8px',
  borderLeft: '4px solid #f59e0b',
};

const infoText = {
  color: '#f59e0b',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};
