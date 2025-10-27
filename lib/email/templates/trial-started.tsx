import { Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface TrialStartedEmailProps {
  userName: string;
  planName: string;
}

export default function TrialStartedEmail({ userName, planName }: TrialStartedEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';

  return (
    <EmailLayout preview={`Your ${planName} trial has started!`}>
      <Heading style={h1}>Your {planName} Trial is Active! 🚀</Heading>

      <Text style={text}>
        Hi there,
      </Text>

      <Text style={text}>
        Great news! Your 7-day free trial of the {planName} plan has started. You now have full access to all premium features.
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={featuresBox}>
        <tr>
          <td style={featuresBoxInner}>
            <Text style={featuresHeading}>What&apos;s included in your trial:</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '16px' }}>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>Unlimited post scheduling</td>
              </tr>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>AI caption suggestions</td>
              </tr>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>Advanced analytics</td>
              </tr>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>Team collaboration</td>
              </tr>
              <tr>
                <td style={iconCell}>✓</td>
                <td style={featureText}>Priority support</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={text}>
        Your trial will end in 7 days. After that, you&apos;ll be charged according to your selected billing cycle. You can cancel anytime before then.
      </Text>

      <Button style={button} href={`${appUrl}/dashboard`}>
        Start Creating Posts
      </Button>

      <Text style={text}>
        Questions? Our team is here to help you get the most out of SocialCal.
      </Text>

      <Text style={signature}>
        Happy scheduling!<br />
        The SocialCal Team
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

const featuresBox = {
  margin: '32px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const featuresBoxInner = {
  backgroundColor: '#ecfdf5',
  padding: '32px',
  borderLeft: '4px solid #10b981',
};

const featuresHeading = {
  color: '#059669',
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

const button = {
  backgroundColor: '#10b981',
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
