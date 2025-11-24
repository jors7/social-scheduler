import { Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface AffiliateCommissionEarnedProps {
  affiliate_name: string;
  commission_amount: number;
  payment_amount: number;
  commission_rate: number;
  pending_balance: number;
  total_earnings: number;
  is_first_commission: boolean;
  dashboard_url: string;
}

export default function AffiliateCommissionEarned({
  affiliate_name,
  commission_amount,
  payment_amount,
  commission_rate,
  pending_balance,
  total_earnings,
  is_first_commission,
  dashboard_url,
}: AffiliateCommissionEarnedProps) {
  const heading = is_first_commission
    ? '🎉 Congratulations on Your First Commission!'
    : `💰 You Earned $${commission_amount.toFixed(2)}!`;

  return (
    <EmailLayout preview={`You earned $${commission_amount.toFixed(2)} in commission!`}>
      <Heading style={h1}>{heading}</Heading>

      <Text style={text}>
        Hi {affiliate_name},
      </Text>

      <Text style={text}>
        {is_first_commission
          ? `Amazing news! You just earned your first commission of $${commission_amount.toFixed(2)}. This is just the beginning of your affiliate journey with SocialCal!`
          : `Great news! A customer you referred just made a payment, and you've earned $${commission_amount.toFixed(2)} in commission.`}
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={infoBox}>
        <tr>
          <td style={infoBoxInner}>
            <Text style={infoTitle}>Commission Details</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={labelCell}>Customer Payment:</td>
                <td style={valueCell}>${payment_amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={labelCell}>Your Commission Rate:</td>
                <td style={valueCell}>{commission_rate}%</td>
              </tr>
              <tr>
                <td style={labelCell}>Commission Earned:</td>
                <td style={highlightValueCell}>${commission_amount.toFixed(2)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellPadding="0" cellSpacing="0" style={balanceBox}>
        <tr>
          <td style={balanceBoxInner}>
            <Text style={balanceTitle}>Your Balance</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={labelCell}>Pending Balance:</td>
                <td style={highlightValueCell}>${pending_balance.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={labelCell}>Total Earnings:</td>
                <td style={valueCell}>${total_earnings.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={labelCell}>Minimum for Payout:</td>
                <td style={valueCell}>$50.00</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {pending_balance >= 50 ? (
        <Text style={payoutReady}>
          🎊 <strong>Your balance is ready for payout!</strong> You can now request a payout from your affiliate dashboard.
        </Text>
      ) : (
        <Text style={payoutProgress}>
          You need <strong>${(50 - pending_balance).toFixed(2)}</strong> more to reach the minimum payout threshold.
        </Text>
      )}

      <Button style={button} href={dashboard_url}>
        View Your Dashboard
      </Button>

      {is_first_commission && (
        <table width="100%" cellPadding="0" cellSpacing="0" style={tipsBox}>
          <tr>
            <td style={tipsBoxInner}>
              <Text style={tipsTitle}>🚀 What&apos;s Next?</Text>
              <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
                <tr>
                  <td style={iconCell}>•</td>
                  <td style={tipText}>Keep sharing your referral link to earn more</td>
                </tr>
                <tr>
                  <td style={iconCell}>•</td>
                  <td style={tipText}>You&apos;ll earn {commission_rate}% recurring commission for 12 months</td>
                </tr>
                <tr>
                  <td style={iconCell}>•</td>
                  <td style={tipText}>Request payouts once you reach $50</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      )}

      <Text style={footnote}>
        <strong>Note:</strong> Commissions are held for 30 days before payout to account for refunds and chargebacks.
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

const balanceBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const balanceBoxInner = {
  backgroundColor: '#f5f3ff',
  padding: '24px',
  borderLeft: '4px solid #8b5cf6',
};

const balanceTitle = {
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

const highlightValueCell = {
  color: '#16a34a',
  fontSize: '16px',
  lineHeight: '24px',
  paddingBottom: '8px',
  fontWeight: '700' as const,
};

const payoutReady = {
  color: '#16a34a',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '24px 0 16px',
  padding: '16px',
  backgroundColor: '#f0fdf4',
  borderRadius: '6px',
  textAlign: 'center' as const,
};

const payoutProgress = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '24px 0 16px',
  textAlign: 'center' as const,
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
