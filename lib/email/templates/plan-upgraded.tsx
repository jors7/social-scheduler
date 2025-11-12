import { Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';
import { formatCurrencyForEmail } from '@/lib/utils/currency';

interface PlanUpgradedEmailProps {
  userName: string;
  oldPlan: string;
  newPlan: string;
  proratedAmount?: number;
  currency?: string;
}

export default function PlanUpgradedEmail({
  userName,
  oldPlan,
  newPlan,
  proratedAmount,
  currency = 'usd'
}: PlanUpgradedEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';
  const proratedFormatted = proratedAmount ? formatCurrencyForEmail(proratedAmount, currency).formatted : null;

  return (
    <EmailLayout preview={`You've upgraded to ${newPlan}!`}>
      <Heading style={h1}>Plan Upgraded! 🎉</Heading>

      <Text style={text}>
        Hi there,
      </Text>

      <Text style={text}>
        Great choice! You&apos;ve successfully upgraded from <strong>{oldPlan}</strong> to <strong>{newPlan}</strong>.
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={upgradeBox}>
        <tr>
          <td style={upgradeBoxInner}>
            <Text style={upgradeText}>
              ✨ Your new {newPlan} features are active immediately!
            </Text>
          </td>
        </tr>
      </table>

      {proratedAmount && proratedAmount > 0 && proratedFormatted && (
        <table width="100%" cellPadding="0" cellSpacing="0" style={prorationBox}>
          <tr>
            <td style={prorationBoxInner}>
              <Text style={prorationText}>
                📊 <strong>Proration Notice:</strong> You were charged {proratedFormatted} for the remainder of your current billing period. Your next full billing cycle will start on your renewal date.
              </Text>
            </td>
          </tr>
        </table>
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

const upgradeBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const upgradeBoxInner = {
  backgroundColor: '#ecfdf5',
  padding: '32px',
  borderLeft: '4px solid #10b981',
  textAlign: 'center' as const,
};

const upgradeText = {
  color: '#059669',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0',
};

const prorationBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const prorationBoxInner = {
  backgroundColor: '#fff7ed',
  padding: '20px',
  borderLeft: '4px solid #f59e0b',
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
