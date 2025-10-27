import { Text, Heading, Button, Section } from '@react-email/components';
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

      <Section style={features}>
        <Text style={featureText}>✓ Schedule posts across multiple platforms</Text>
        <Text style={featureText}>✓ AI-powered caption suggestions</Text>
        <Text style={featureText}>✓ Analytics and insights</Text>
        <Text style={featureText}>✓ Team collaboration</Text>
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
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  lineHeight: '1.2',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const features = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#f6f9fc',
  borderRadius: '12px',
  borderLeft: '4px solid #6366f1',
};

const featureText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '28px',
  margin: '8px 0',
  fontWeight: '500',
};

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  margin: '32px 0',
  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
};

const signature = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
