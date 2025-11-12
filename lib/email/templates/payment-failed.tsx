import { Text, Heading, Button, Section } from '@react-email/components';
import { EmailLayout } from './components/email-layout';
import { formatCurrencyForEmail } from '@/lib/utils/currency';

interface PaymentFailedEmailProps {
  userName: string;
  amount: number;
  currency?: string;
  updatePaymentUrl: string;
}

export default function PaymentFailedEmail({
  userName,
  amount,
  currency = 'usd',
  updatePaymentUrl
}: PaymentFailedEmailProps) {
  const { formatted: formattedAmount } = formatCurrencyForEmail(amount, currency);

  return (
    <EmailLayout preview="Payment Failed - Action Required">
      <Heading style={h1}>Payment Failed ⚠️</Heading>

      <Text style={text}>
        Hi {userName},
      </Text>

      <Text style={text}>
        We weren&apos;t able to process your payment of <strong>{formattedAmount}</strong> for your SocialCal subscription.
      </Text>

      <Section style={warningBox}>
        <Text style={warningTitle}>⏰ Action Required</Text>
        <Text style={warningText}>
          To avoid any interruption to your service, please update your payment method as soon as possible.
        </Text>
      </Section>

      <Text style={text}>
        Common reasons for payment failures:
      </Text>
      <Text style={listText}>
        • Insufficient funds<br />
        • Expired card<br />
        • Card security check failed<br />
        • Payment method declined by your bank
      </Text>

      <Button style={button} href={updatePaymentUrl}>
        Update Payment Method
      </Button>

      <Text style={text}>
        If you&apos;re having trouble updating your payment method or if you believe this is an error, please contact our support team immediately.
      </Text>

      <Button style={secondaryButton} href="mailto:support@socialcal.app">
        Contact Support
      </Button>

      <Text style={footnote}>
        Your subscription will remain active for a limited time while we attempt to collect payment. After several failed attempts, your account may be downgraded to the free plan.
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

const listText = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '26px',
  margin: '8px 0 8px 20px',
};

const warningBox = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  borderLeft: '4px solid #ef4444',
};

const warningTitle = {
  color: '#dc2626',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const warningText = {
  color: '#7f1d1d',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const button = {
  backgroundColor: '#ef4444',
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

const footnote = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '24px 0 0',
  padding: '16px',
  backgroundColor: '#f6f9fc',
  borderRadius: '6px',
};

const signature = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 0',
};
