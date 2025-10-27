import { Text, Heading, Button, Section, Row, Column } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface WelcomeEmailProps {
  userName: string;
}

export default function WelcomeEmail({ userName }: WelcomeEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';

  return (
    <EmailLayout preview="Welcome to SocialCal! Let's get you started.">
      <Heading style={h1}>Welcome to SocialCal, {userName}! 👋</Heading>

      <Text style={text}>
        We&apos;re thrilled to have you on board! SocialCal makes it easy to schedule and manage your social media content across all platforms.
      </Text>

      <Section>
        <Row>
          <Column style={features}>
            <Text style={featureText}>✓ Schedule posts across multiple platforms</Text>
            <Text style={featureText}>✓ AI-powered caption suggestions</Text>
            <Text style={featureText}>✓ Analytics and insights</Text>
            <Text style={featureText}>✓ Team collaboration</Text>
          </Column>
        </Row>
      </Section>

      <Text style={text}>
        Ready to get started? Connect your social media accounts and create your first post!
      </Text>

      <Button style={button} href={`${appUrl}/dashboard`}>
        Go to Dashboard
      </Button>

      <Text style={text}>
        If you have any questions or need help getting started, our support team is always here to help.
      </Text>

      <Text style={signature}>
        Best regards,<br />
        The SocialCal Team
      </Text>
    </EmailLayout>
  );
}

const h1 = {
  color: '#111827',
  fontSize: '28px',
  fontWeight: '700' as const,
  margin: '0 0 24px',
  lineHeight: '1.3',
  letterSpacing: '-0.02em',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '0 0 20px',
};

const features = {
  margin: '28px 0',
  padding: '32px 28px',
  border: '2px solid #e5e7eb',
  borderRadius: '8px',
  borderLeft: '5px solid #6366f1',
};

const featureText = {
  color: '#111827',
  fontSize: '15px',
  lineHeight: '30px',
  margin: '0',
  fontWeight: '500' as const,
};

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  margin: '28px 0',
};

const signature = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
