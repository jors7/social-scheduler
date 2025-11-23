import { Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface AffiliateApplicationApprovedProps {
  first_name: string;
  referral_code: string;
  commission_rate: number;
  login_url: string;
  dashboard_url: string;
}

export default function AffiliateApplicationApproved({
  first_name,
  referral_code,
  commission_rate,
  login_url,
  dashboard_url,
}: AffiliateApplicationApprovedProps) {
  return (
    <EmailLayout preview="Congratulations! Your affiliate application has been approved.">
      <Heading style={h1}>Welcome to the SocialCal Affiliate Program! 🎉</Heading>

      <Text style={text}>
        Hi {first_name},
      </Text>

      <Text style={text}>
        Great news! Your application to join the SocialCal Affiliate Program has been approved. Welcome aboard!
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={infoBox}>
        <tr>
          <td style={infoBoxInner}>
            <Text style={infoTitle}>Your Affiliate Details</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={labelCell}>Referral Code:</td>
                <td style={valueCell}>{referral_code}</td>
              </tr>
              <tr>
                <td style={labelCell}>Commission Rate:</td>
                <td style={valueCell}>{commission_rate}% recurring for 12 months</td>
              </tr>
              <tr>
                <td style={labelCell}>Cookie Window:</td>
                <td style={valueCell}>90 days</td>
              </tr>
              <tr>
                <td style={labelCell}>Minimum Payout:</td>
                <td style={valueCell}>$50</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={text}>
        You can now start earning commissions by sharing your unique referral link with your audience!
      </Text>

      <Button style={button} href={dashboard_url}>
        Access Your Affiliate Dashboard
      </Button>

      <table width="100%" cellPadding="0" cellSpacing="0" style={featuresBox}>
        <tr>
          <td style={featuresBoxInner}>
            <Text style={featuresTitle}>Getting Started:</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={iconCell}>1.</td>
                <td style={featureText}>Log in to your affiliate dashboard</td>
              </tr>
              <tr>
                <td style={iconCell}>2.</td>
                <td style={featureText}>Generate your unique referral links</td>
              </tr>
              <tr>
                <td style={iconCell}>3.</td>
                <td style={featureText}>Share with your audience and start earning!</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={text}>
        Your login credentials are the same as your signup email and password. If you have any questions, feel free to reach out to our affiliate support team.
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
  backgroundColor: '#f0f9ff',
  padding: '24px',
  borderLeft: '4px solid #0ea5e9',
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

const featuresBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const featuresBoxInner = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  borderLeft: '4px solid #8b5cf6',
};

const featuresTitle = {
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
