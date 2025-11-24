import { Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface AffiliateTrialStartedProps {
  affiliate_name: string;
  plan_name: string;
  trial_days: number;
  referral_code: string;
  dashboard_url: string;
}

export default function AffiliateTrialStarted({
  affiliate_name,
  plan_name,
  trial_days,
  referral_code,
  dashboard_url,
}: AffiliateTrialStartedProps) {
  return (
    <EmailLayout preview="Great news! Someone started a free trial using your referral link.">
      <Heading style={h1}>New Trial Signup via Your Referral Link! 🎉</Heading>

      <Text style={text}>
        Hi {affiliate_name},
      </Text>

      <Text style={text}>
        Great news! Someone just started a <strong>{trial_days}-day free trial</strong> using your referral link.
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={infoBox}>
        <tr>
          <td style={infoBoxInner}>
            <Text style={infoTitle}>Trial Details</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={labelCell}>Plan:</td>
                <td style={valueCell}>{plan_name}</td>
              </tr>
              <tr>
                <td style={labelCell}>Trial Length:</td>
                <td style={valueCell}>{trial_days} days</td>
              </tr>
              <tr>
                <td style={labelCell}>Your Referral Code:</td>
                <td style={valueCell}>{referral_code}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={text}>
        Your referral link is working! If this trial converts to a paid subscription after {trial_days} days, you&apos;ll earn your commission automatically.
      </Text>

      <Button style={button} href={dashboard_url}>
        View Your Dashboard
      </Button>

      <table width="100%" cellPadding="0" cellSpacing="0" style={tipsBox}>
        <tr>
          <td style={tipsBoxInner}>
            <Text style={tipsTitle}>💡 Keep Your Momentum Going:</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={iconCell}>•</td>
                <td style={tipText}>Continue sharing your referral link with your audience</td>
              </tr>
              <tr>
                <td style={iconCell}>•</td>
                <td style={tipText}>Trials that convert earn you 30% recurring commission</td>
              </tr>
              <tr>
                <td style={iconCell}>•</td>
                <td style={tipText}>Check your dashboard to track all your referrals</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={footnote}>
        <strong>Note:</strong> You&apos;ll receive a commission notification once the trial converts to a paid subscription.
      </Text>

      <Text style={signature}>
        Best regards,<br />
        The SocialCal Affiliate Team
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
  backgroundColor: '#f0fdf4',
  padding: '24px',
  borderLeft: '4px solid #22c55e',
};

const infoTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0 0 16px',
};

const labelCell = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '24px',
  paddingBottom: '8px',
  paddingRight: '16px',
  verticalAlign: 'top',
  fontWeight: '500' as const,
};

const valueCell = {
  color: '#1a1a1a',
  fontSize: '14px',
  lineHeight: '24px',
  paddingBottom: '8px',
  fontWeight: '600' as const,
};

const tipsBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const tipsBoxInner = {
  backgroundColor: '#fef9f3',
  padding: '24px',
  borderLeft: '4px solid #f59e0b',
};

const tipsTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0',
};

const iconCell = {
  color: '#f59e0b',
  fontSize: '18px',
  fontWeight: '700' as const,
  width: '24px',
  paddingRight: '12px',
  paddingBottom: '12px',
  verticalAlign: 'top',
};

const tipText = {
  color: '#1a1a1a',
  fontSize: '16px',
  lineHeight: '26px',
  paddingBottom: '12px',
  fontWeight: '400' as const,
};

const footnote = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 16px',
  fontStyle: 'italic' as const,
};

const button = {
  backgroundColor: '#8b5cf6',
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
