import { Text, Heading } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface AffiliatePayoutProcessedProps {
  amount: number;
  paypal_email: string;
  referral_code: string;
  paypal_batch_id: string;
}

export default function AffiliatePayoutProcessed({
  amount,
  paypal_email,
  referral_code,
  paypal_batch_id,
}: AffiliatePayoutProcessedProps) {
  return (
    <EmailLayout preview={`Your payout of $${amount} is being processed`}>
      <Heading style={h1}>Your Payout is On Its Way! 💸</Heading>

      <Text style={text}>
        Great news! Your affiliate payout has been processed and is being sent to your PayPal account.
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={infoBox}>
        <tr>
          <td style={infoBoxInner}>
            <Text style={infoTitle}>Payout Details</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={labelCell}>Amount:</td>
                <td style={valueCell}>${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={labelCell}>PayPal Email:</td>
                <td style={valueCell}>{paypal_email}</td>
              </tr>
              <tr>
                <td style={labelCell}>Referral Code:</td>
                <td style={valueCell}>{referral_code}</td>
              </tr>
              <tr>
                <td style={labelCell}>PayPal Batch ID:</td>
                <td style={valueCell}>{paypal_batch_id}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellPadding="0" cellSpacing="0" style={timelineBox}>
        <tr>
          <td style={timelineBoxInner}>
            <Text style={timelineTitle}>What&apos;s Next?</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>PayPal processes the batch payout (usually within 24 hours)</td>
              </tr>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>Funds arrive in your PayPal account</td>
              </tr>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>You&apos;ll receive a confirmation email from PayPal</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={text}>
        If you don&apos;t receive the funds within 2-3 business days, please check your PayPal account settings and contact our affiliate support team.
      </Text>

      <Text style={text}>
        Thank you for being a valued SocialCal affiliate partner. Keep up the great work!
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
  borderLeft: '4px solid #10b981',
};

const infoTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0',
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

const timelineBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const timelineBoxInner = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  borderLeft: '4px solid #8b5cf6',
};

const timelineTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0',
};

const iconCell = {
  color: '#8b5cf6',
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

const signature = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
