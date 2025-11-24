import { Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface AffiliateConversionCancelledProps {
  affiliate_name: string;
  customer_email: string;
  plan_name: string;
  signup_date: string;
  cancellation_date: string;
  commission_amount: number;
  was_commission_deducted: boolean;
  referral_code: string;
  dashboard_url: string;
}

export default function AffiliateConversionCancelled({
  affiliate_name,
  customer_email,
  plan_name,
  signup_date,
  cancellation_date,
  commission_amount,
  was_commission_deducted,
  referral_code,
  dashboard_url,
}: AffiliateConversionCancelledProps) {
  return (
    <EmailLayout preview="A referred customer has cancelled their subscription">
      <Heading style={h1}>Conversion Cancelled</Heading>

      <Text style={text}>
        Hi {affiliate_name},
      </Text>

      <Text style={text}>
        We&apos;re writing to let you know that a customer you referred has cancelled their subscription.
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={infoBox}>
        <tr>
          <td style={infoBoxInner}>
            <Text style={infoTitle}>Cancellation Details</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={labelCell}>Customer:</td>
                <td style={valueCell}>{customer_email}</td>
              </tr>
              <tr>
                <td style={labelCell}>Plan:</td>
                <td style={valueCell}>{plan_name}</td>
              </tr>
              <tr>
                <td style={labelCell}>Signed Up:</td>
                <td style={valueCell}>{signup_date}</td>
              </tr>
              <tr>
                <td style={labelCell}>Cancelled:</td>
                <td style={valueCell}>{cancellation_date}</td>
              </tr>
              <tr>
                <td style={labelCell}>Your Referral Code:</td>
                <td style={valueCell}>{referral_code}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {was_commission_deducted ? (
        <>
          <table width="100%" cellPadding="0" cellSpacing="0" style={warningBox}>
            <tr>
              <td style={warningBoxInner}>
                <Text style={warningTitle}>Commission Deducted</Text>
                <Text style={warningText}>
                  Since this cancellation occurred during the 30-day pending period, the commission of <strong>${commission_amount.toFixed(2)}</strong> has been deducted from your pending balance.
                </Text>
              </td>
            </tr>
          </table>

          <Text style={text}>
            Don&apos;t worry - this is normal! Commissions are held for 30 days to account for cancellations and refunds. Once a subscription stays active for 30 days, your commission is approved and protected.
          </Text>
        </>
      ) : (
        <Text style={text}>
          This cancellation occurred after the 30-day pending period, so your commission of <strong>${commission_amount.toFixed(2)}</strong> remains in your account.
        </Text>
      )}

      <Button style={button} href={dashboard_url}>
        View Your Dashboard
      </Button>

      <table width="100%" cellPadding="0" cellSpacing="0" style={tipsBox}>
        <tr>
          <td style={tipsBoxInner}>
            <Text style={tipsTitle}>💡 How to Reduce Cancellations:</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={iconCell}>•</td>
                <td style={tipText}>Refer customers who truly need social media management</td>
              </tr>
              <tr>
                <td style={iconCell}>•</td>
                <td style={tipText}>Set clear expectations about features and pricing</td>
              </tr>
              <tr>
                <td style={iconCell}>•</td>
                <td style={tipText}>Provide guidance on how to get the most value from SocialCal</td>
              </tr>
              <tr>
                <td style={iconCell}>•</td>
                <td style={tipText}>Focus on quality referrals over quantity</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={footnote}>
        Questions about this cancellation? Feel free to reach out to our affiliate support team.
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
  backgroundColor: '#f8fafc',
  padding: '24px',
  borderLeft: '4px solid #64748b',
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
  verticalAlign: 'top' as const,
  fontWeight: '500' as const,
};

const valueCell = {
  color: '#1a1a1a',
  fontSize: '14px',
  lineHeight: '24px',
  paddingBottom: '8px',
  fontWeight: '600' as const,
};

const warningBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const warningBoxInner = {
  backgroundColor: '#fef3c7',
  padding: '24px',
  borderLeft: '4px solid #f59e0b',
};

const warningTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
};

const warningText = {
  color: '#78350f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0',
};

const tipsBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const tipsBoxInner = {
  backgroundColor: '#f0f9ff',
  padding: '24px',
  borderLeft: '4px solid #3b82f6',
};

const tipsTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0',
};

const iconCell = {
  color: '#3b82f6',
  fontSize: '18px',
  fontWeight: '700' as const,
  width: '24px',
  paddingRight: '12px',
  paddingBottom: '12px',
  verticalAlign: 'top' as const,
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
