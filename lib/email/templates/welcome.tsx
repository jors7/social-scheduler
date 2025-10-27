import { Text, Heading, Button } from '@react-email/components';
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

      <table width="100%" cellPadding="0" cellSpacing="0" style={featuresBox}>
        <tr>
          <td style={featuresBoxInner}>
            <Text style={featuresTitle}>What you can do with SocialCal:</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>Schedule posts across multiple platforms</td>
              </tr>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>AI-powered caption suggestions</td>
              </tr>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>Analytics and insights</td>
              </tr>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>Team collaboration</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

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

const featuresBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const featuresBoxInner = {
  backgroundColor: '#f9fafb',
  padding: '32px',
  borderLeft: '4px solid #6366f1',
};

const featuresTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0',
};

const iconCell = {
  color: '#6366f1',
  fontSize: '18px',
  fontWeight: '700' as const,
  width: '32px',
  paddingRight: '12px',
  paddingBottom: '12px',
  verticalAlign: 'top',
};

const featureText = {
  color: '#1a1a1a',
  fontSize: '16px',
  lineHeight: '26px',
  paddingBottom: '12px',
  fontWeight: '400' as const,
};

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  margin: '24px 0',
};

const signature = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
