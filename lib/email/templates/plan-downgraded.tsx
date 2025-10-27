import { Text, Heading, Button } from '@react-email/components';
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
        Hi there,
      </Text>

      <Text style={text}>
        Your subscription plan will change from <strong>{oldPlan}</strong> to <strong>{newPlan}</strong> on <strong>{formattedDate}</strong>.
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={infoBox}>
        <tr>
          <td style={infoBoxInner}>
            <Text style={infoTitle}>What This Means:</Text>
            <Text style={infoText}>
              • You&apos;ll continue to have access to all {oldPlan} features until {formattedDate}<br />
              • After that date, your account will switch to the {newPlan} features<br />
              • Your billing will be adjusted accordingly
            </Text>
          </td>
        </tr>
      </table>

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

const infoBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const infoBoxInner = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  borderLeft: '4px solid #6366f1',
};

const infoTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600' as const,
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
