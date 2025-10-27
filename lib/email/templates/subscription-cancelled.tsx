import { Text, Heading, Button, Section } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface SubscriptionCancelledEmailProps {
  userName: string;
  planName: string;
  endDate: Date;
}

export default function SubscriptionCancelledEmail({
  userName,
  planName,
  endDate
}: SubscriptionCancelledEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';
  const formattedDate = endDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <EmailLayout preview="Your subscription has been cancelled">
      <Heading style={h1}>Subscription Cancelled</Heading>

      <Text style={text}>
        Hi {userName},
      </Text>

      <Text style={text}>
        We&apos;re sorry to see you go! Your {planName} subscription has been cancelled and will end on <strong>{formattedDate}</strong>.
      </Text>

      <Section style={accessBox}>
        <Text style={accessTitle}>What Happens Next:</Text>
        <Text style={accessText}>
          • You&apos;ll continue to have full access to {planName} features until {formattedDate}<br />
          • After that, your account will switch to the Free plan<br />
          • All your data will be safely stored and accessible<br />
          • You won&apos;t be charged again unless you resubscribe
        </Text>
      </Section>

      <Text style={text}>
        Changed your mind? You can reactivate your subscription at any time before {formattedDate} to continue without interruption.
      </Text>

      <Button style={button} href={`${appUrl}/dashboard/billing`}>
        Reactivate Subscription
      </Button>

      <Section style={feedbackBox}>
        <Text style={feedbackText}>
          We&apos;d love to hear your feedback! Let us know how we can improve SocialCal.
        </Text>
        <Button style={secondaryButton} href={`${appUrl}/support`}>
          Share Feedback
        </Button>
      </Section>

      <Text style={text}>
        Thank you for being part of SocialCal. We hope to see you again soon!
      </Text>

      <Text style={signature}>
        Best wishes,<br />
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

const accessBox = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  border: '1px solid #e6ebf1',
};

const accessTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const accessText = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
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

const feedbackBox = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const feedbackText = {
  color: '#92400e',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
  fontWeight: '500',
};

const secondaryButton = {
  backgroundColor: 'transparent',
  border: '1px solid #d97706',
  borderRadius: '8px',
  color: '#d97706',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
};

const signature = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 0',
};
