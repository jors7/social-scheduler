import { Text, Heading, Button, Section } from '@react-email/components';
import { EmailLayout } from './components/email-layout';
import { formatCurrencyForEmail } from '@/lib/utils/currency';

interface PaymentRequiredEmailProps {
  userName: string;
  planName: string;
  amount: number;
  currency: string;
  paymentUrl: string;
  reason?: string;
}

export default function PaymentRequiredEmail({
  userName,
  planName,
  amount,
  currency,
  paymentUrl,
  reason
}: PaymentRequiredEmailProps) {
  const { formatted: formattedAmount } = formatCurrencyForEmail(amount, currency);

  return (
    <EmailLayout preview="Payment Required to Complete Upgrade">
      <Heading style={h1}>Payment Required 💳</Heading>

      <Text style={text}>
        Hi {userName},
      </Text>

      <Text style={text}>
        Your plan upgrade to <strong>{planName}</strong> requires payment to activate.
      </Text>

      <Section style={paymentBox}>
        <table width="100%" cellPadding="0" cellSpacing="0">
          <tr>
            <td style={label}>Plan:</td>
            <td style={value}>{planName}</td>
          </tr>
          <tr>
            <td style={label}>Amount Due:</td>
            <td style={amountValue}>{formattedAmount}</td>
          </tr>
          {reason && (
            <tr>
              <td colSpan={2} style={reasonText}>
                <br />
                <strong>Note:</strong> {reason}
              </td>
            </tr>
          )}
        </table>
      </Section>

      <Text style={text}>
        <strong>Complete your payment now to activate your new features immediately.</strong>
      </Text>

      <Button style={button} href={paymentUrl}>
        Complete Payment
      </Button>

      <Section style={infoBox}>
        <Text style={infoText}>
          <strong>What happens next?</strong><br /><br />
          ✓ Complete payment securely through Stripe<br />
          ✓ Your {planName} features activate immediately<br />
          ✓ You&apos;ll receive a payment receipt via email
        </Text>
      </Section>

      <Text style={text}>
        If you don&apos;t complete payment, your account will remain on your current plan and no charges will be made.
      </Text>

      <Button style={secondaryButton} href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`}>
        View Billing Settings
      </Button>

      <Text style={footnote}>
        This payment link is secure and valid for 24 hours. If you didn&apos;t request this upgrade or have questions, please contact our support team.
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

const paymentBox = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#fff7ed',
  borderRadius: '8px',
  borderLeft: '4px solid #f59e0b',
};

const label = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '8px 16px 8px 0',
  width: '40%',
};

const value = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '500' as const,
  padding: '8px 0',
};

const amountValue = {
  color: '#f59e0b',
  fontSize: '20px',
  fontWeight: 'bold' as const,
  padding: '8px 0',
};

const reasonText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '22px',
  padding: '8px 0',
};

const infoBox = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  borderLeft: '4px solid #3b82f6',
};

const infoText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0',
};

const button = {
  backgroundColor: '#f59e0b',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  margin: '24px 0',
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
  margin: '16px 0',
};

const footnote = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '32px 0 0',
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
};

const signature = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
