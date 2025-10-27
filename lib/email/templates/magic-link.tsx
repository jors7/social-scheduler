import { Text, Heading, Button, Section } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface MagicLinkEmailProps {
  magicLink: string;
}

export default function MagicLinkEmail({ magicLink }: MagicLinkEmailProps) {
  return (
    <EmailLayout preview="Your SocialCal login link is ready">
      <Heading style={h1}>Sign in to SocialCal</Heading>

      <Text style={text}>
        Click the button below to securely sign in to your SocialCal account. This link will expire in 1 hour.
      </Text>

      <Button style={button} href={magicLink}>
        Sign In to SocialCal
      </Button>

      <Section style={infoBox}>
        <Text style={infoText}>
          🔒 This is a secure, one-time login link. If you didn&apos;t request this email, you can safely ignore it.
        </Text>
      </Section>

      <Text style={text}>
        For security reasons, this link will only work once and expires after 1 hour.
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
  backgroundColor: '#f0f7ff',
  borderRadius: '8px',
  borderLeft: '4px solid #0070f3',
};

const infoText = {
  color: '#0070f3',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};
