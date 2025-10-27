import { Text, Heading, Button, Section, Row, Column, Hr } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface PaymentReceiptEmailProps {
  userName: string;
  planName: string;
  amount: number;
  currency: string;
  invoiceUrl?: string;
}

export default function PaymentReceiptEmail({
  userName,
  planName,
  amount,
  currency,
  invoiceUrl
}: PaymentReceiptEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';
  const formattedAmount = (amount / 100).toFixed(2);
  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <EmailLayout preview="Payment Received - Thank you!">
      <Heading style={h1}>Payment Received ✓</Heading>

      <Text style={text}>
        Hi {userName},
      </Text>

      <Text style={text}>
        Thank you! Your payment has been processed successfully.
      </Text>

      <Section>
        <Row>
          <Column style={receiptBox}>
            <Text style={receiptTitle}>Payment Details</Text>
            <Hr style={hr} />
            <table style={receiptTable}>
              <tr>
                <td style={label}>Date:</td>
                <td style={value}>{formattedDate}</td>
              </tr>
              <tr>
                <td style={label}>Plan:</td>
                <td style={value}>{planName}</td>
              </tr>
              <tr>
                <td style={label}>Amount:</td>
                <td style={amountValue}>${formattedAmount} {currency.toUpperCase()}</td>
              </tr>
            </table>
          </Column>
        </Row>
      </Section>

      {invoiceUrl && (
        <Button style={button} href={invoiceUrl}>
          Download Invoice
        </Button>
      )}

      <Text style={text}>
        Your subscription will continue uninterrupted. You can view all your payment history and manage your subscription in your billing settings.
      </Text>

      <Button style={secondaryButton} href={`${appUrl}/dashboard/billing`}>
        View Billing History
      </Button>

      <Text style={footnote}>
        If you have any questions about this payment, please don&apos;t hesitate to contact our support team.
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

const receiptBox = {
  margin: '32px 0',
  padding: '24px',
  border: '2px solid #10b981',
  borderRadius: '6px',
  borderLeft: '6px solid #10b981',
};

const receiptTitle = {
  color: '#059669',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '0 0 16px',
};

const hr = {
  borderColor: '#d1fae5',
  margin: '0 0 16px',
};

const receiptTable = {
  width: '100%',
};

const label = {
  color: '#6b7280',
  fontSize: '14px',
  padding: '8px 0',
  width: '40%',
};

const value = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '500' as const,
  padding: '8px 0',
};

const amountValue = {
  color: '#059669',
  fontSize: '20px',
  fontWeight: 'bold' as const,
  padding: '8px 0',
};

const button = {
  backgroundColor: '#10b981',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  margin: '32px 0 16px',
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
  margin: '8px 0',
};

const footnote = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 0',
};

const signature = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
