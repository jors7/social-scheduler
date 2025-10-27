import { Text, Heading, Button, Section } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface PlanUpgradedEmailProps {
  userName: string;
  oldPlan: string;
  newPlan: string;
  proratedAmount?: number;
}

export default function PlanUpgradedEmail({
  userName,
  oldPlan,
  newPlan,
  proratedAmount
}: PlanUpgradedEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';

  return (
    <EmailLayout preview={`You've upgraded to ${newPlan}!`}>
      <Heading style={h1}>Plan Upgraded! 🎉</Heading>

      <Text style={text}>
        Hi {userName},
      </Text>

      <Text style={text}>
        Great choice! You&apos;ve successfully upgraded from <strong>{oldPlan}</strong> to <strong>{newPlan}</strong>.
      </Text>

      <Section style={upgradeBox}>
        <Text style={upgradeText}>
          ✨ Your new {newPlan} features are active immediately!
        </Text>
      </Section>

      {proratedAmount && proratedAmount > 0 && (
        <Section style={prorationBox}>
          <Text style={prorationText}>
            📊 <strong>Proration Notice:</strong> You were charged ${(proratedAmount / 100).toFixed(2)} for the remainder of your current billing period. Your next full billing cycle will start on your renewal date.
          </Text>
        </Section>
      )}

      <Text style={text}>
        You now have access to all the enhanced features of the {newPlan} plan. Start exploring the new capabilities today!
      </Text>

      <Button style={button} href={`${appUrl}/dashboard`}>
        Explore New Features
      </Button>

      <Text style={text}>
        You can view your updated subscription details and billing information anytime from your account settings.
      </Text>

      <Button style={secondaryButton} href={`${appUrl}/dashboard/billing`}>
        View Subscription Details
      </Button>

      <Text style={signature}>
        Enjoy your upgrade!<br />
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

const upgradeBox = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  borderLeft: '4px solid #10b981',
  textAlign: 'center' as const,
};

const upgradeText = {
  color: '#059669',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const prorationBox = {
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#fff7ed',
  borderRadius: '8px',
  border: '1px solid #fed7aa',
};

const prorationText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '22px',
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

const secondaryButton = {
  backgroundColor: 'transparent',
  border: '1px solid #e6ebf1',
  borderRadius: '8px',
  color: '#525f7f',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '16px 0',
};

const signature = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 0',
};
