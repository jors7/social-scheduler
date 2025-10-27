import { Text, Heading, Button, Section } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface PlanDowngradedEmailProps {
  userName: string;
  oldPlan: string;
  newPlan: string;
  effectiveDate: Date;
}

export default function PlanDowngradedEmail({
  userName,
  oldPlan,
  newPlan,
  effectiveDate
}: PlanDowngradedEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';
  const formattedDate = effectiveDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <EmailLayout preview="Your subscription plan has changed">
      <Heading style={h1}>Subscription Plan Changed</Heading>

      <Text style={text}>
        Hi {userName},
      </Text>

      <Text style={text}>
        Your subscription plan will change from <strong>{oldPlan}</strong> to <strong>{newPlan}</strong> on <strong>{formattedDate}</strong>.
      </Text>

      <Section style={infoBox}>
        <Text style={infoTitle}>What This Means:</Text>
        <Text style={infoText}>
          • You&apos;ll continue to have access to all {oldPlan} features until {formattedDate}<br />
          • After that date, your account will switch to the {newPlan} features<br />
          • Your billing will be adjusted accordingly
        </Text>
      </Section>

      <Text style={text}>
        If you change your mind and want to keep your current plan, you can update your subscription at any time before the effective date.
      </Text>

      <Button style={button} href={`${appUrl}/dashboard/billing`}>
        Manage Subscription
      </Button>

      <Text style={text}>
        If you have any questions or concerns, our support team is here to help.
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

const infoBox = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  border: '1px solid #e6ebf1',
};

const infoTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const infoText = {
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

const signature = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 0',
};
