import { Text, Heading, Button, Section, Hr } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface SubscriptionCreatedEmailProps {
  userName: string;
  planName: string;
  billingCycle: string;
  amount: number;
}

export default function SubscriptionCreatedEmail({
  userName,
  planName,
  billingCycle,
  amount
}: SubscriptionCreatedEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';
  const formattedAmount = (amount / 100).toFixed(2);
  const interval = billingCycle === 'monthly' ? 'month' : 'year';

  return (
    <EmailLayout preview={`Welcome to ${planName}! Your subscription is active.`}>
      <Heading style={h1}>Welcome to {planName}! 🎉</Heading>

      <Text style={text}>
        Hi {userName},
      </Text>

      <Text style={text}>
        Your subscription is now active! Thank you for choosing SocialCal to power your social media strategy.
      </Text>

      <Section style={summaryBox}>
        <Text style={summaryTitle}>Subscription Summary</Text>
        <Hr style={hr} />
        <table style={summaryTable}>
          <tr>
            <td style={summaryLabel}>Plan:</td>
            <td style={summaryValue}>{planName}</td>
          </tr>
          <tr>
            <td style={summaryLabel}>Billing:</td>
            <td style={summaryValue}>{billingCycle}</td>
          </tr>
          <tr>
            <td style={summaryLabel}>Amount:</td>
            <td style={summaryValue}>${formattedAmount} / {interval}</td>
          </tr>
        </table>
      </Section>

      <Text style={text}>
        You now have full access to all {planName} features. Start scheduling posts, generating AI captions, and tracking your social media performance.
      </Text>

      <Button style={button} href={`${appUrl}/dashboard`}>
        Go to Dashboard
      </Button>

      <Text style={text}>
        You can manage your subscription, update payment details, or cancel anytime from your billing settings.
      </Text>

      <Button style={secondaryButton} href={`${appUrl}/dashboard/billing`}>
        Manage Subscription
      </Button>

      <Text style={signature}>
        Thanks for being part of SocialCal!<br />
        The SocialCal Team
      </Text>
    </EmailLayout>
  );
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  margin: '0 0 16px',
  lineHeight: '1.2',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const summaryBox = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#f6f9fc',
  borderRadius: '6px',
  borderLeft: '4px solid #6366f1',
};

const summaryTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '0 0 16px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '0 0 16px',
};

const summaryTable = {
  width: '100%',
};

const summaryLabel = {
  color: '#6b7280',
  fontSize: '14px',
  padding: '8px 0',
  width: '40%',
};

const summaryValue = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '8px 0',
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
  padding: '16px 32px',
  margin: '32px 0 16px',
};

const secondaryButton = {
  backgroundColor: 'transparent',
  border: '2px solid #e5e7eb',
  borderRadius: '6px',
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '8px 0',
};

const signature = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
