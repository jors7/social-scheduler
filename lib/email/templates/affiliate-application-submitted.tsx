import { Text, Heading } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface AffiliateApplicationSubmittedProps {
  first_name: string;
  application_id: string;
}

export default function AffiliateApplicationSubmitted({
  first_name,
  application_id,
}: AffiliateApplicationSubmittedProps) {
  return (
    <EmailLayout preview="Thank you for applying to the SocialCal Affiliate Program">
      <Heading style={h1}>Application Received! 📬</Heading>

      <Text style={text}>
        Hi {first_name},
      </Text>

      <Text style={text}>
        Thank you for applying to join the SocialCal Affiliate Program! We&apos;ve received your application and are excited to review it.
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={infoBox}>
        <tr>
          <td style={infoBoxInner}>
            <Text style={infoTitle}>What Happens Next?</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={iconCell}>1.</td>
                <td style={featureText}>Our team reviews your application</td>
              </tr>
              <tr>
                <td style={iconCell}>2.</td>
                <td style={featureText}>You&apos;ll hear back within 24-48 hours</td>
              </tr>
              <tr>
                <td style={iconCell}>3.</td>
                <td style={featureText}>If approved, you&apos;ll receive login credentials and your unique referral code</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={text}>
        Application Reference: <strong>{application_id}</strong>
      </Text>

      <Text style={text}>
        While you wait, feel free to learn more about our platform and what makes SocialCal the best social media scheduler for content creators and businesses.
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

const iconCell = {
  color: '#10b981',
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
