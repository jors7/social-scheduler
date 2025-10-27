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

const features = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
};

const featureText = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '28px',
  margin: '4px 0',
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

const signature = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 0',
};
