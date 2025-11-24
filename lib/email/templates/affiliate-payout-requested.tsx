import React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface AffiliatePayoutRequestedEmailProps {
  affiliate_id: string;
  referral_code: string;
  amount: number;
  payout_id: string;
  paypal_email: string;
  dashboard_url?: string;
}

export default function AffiliatePayoutRequestedEmail({
  affiliate_id,
  referral_code,
  amount,
  payout_id,
  paypal_email,
  dashboard_url = 'https://www.socialcal.app/admin/affiliates?tab=payouts',
}: AffiliatePayoutRequestedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New affiliate payout request: ${amount.toFixed(2)} from {referral_code}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🔔 New Payout Request</Heading>

          <Text style={text}>
            An affiliate has requested a payout. Please review and process the request.
          </Text>

          <Section style={requestBox}>
            <Text style={requestLabel}>Affiliate Code</Text>
            <Text style={requestValue}>{referral_code}</Text>

            <Text style={requestLabel}>Amount Requested</Text>
            <Text style={requestValue}>${amount.toFixed(2)}</Text>

            <Text style={requestLabel}>PayPal Email</Text>
            <Text style={requestValue}>{paypal_email}</Text>

            <Text style={requestLabel}>Payout ID</Text>
            <Text style={requestValueSmall}>{payout_id}</Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={dashboard_url}>
              Review Payouts
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            To process this payout, log in to your admin dashboard and navigate to the Payouts tab.
            Select the pending payout and click "Process Payouts" to send payment via PayPal.
          </Text>

          <Text style={footerSmall}>
            This is an automated notification from SocialCal. Payout ID: {payout_id}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const requestBox = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e1e4e8',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

const requestLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '16px 0 4px 0',
};

const requestValue = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const requestValueSmall = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 8px 0',
  wordBreak: 'break-all' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#9333ea',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 40px',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 0',
  padding: '0 40px',
};

const footerSmall = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '8px 0',
  padding: '0 40px',
};
