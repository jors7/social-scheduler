import { Text, Heading, Button, Section, Row, Column } from '@react-email/components';
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
        Hi {userName},
      </Text>

      <Text style={text}>
        Great news! Your 7-day free trial of the {planName} plan has started. You now have full access to all premium features.
      </Text>

      <Section>
        <Row>
          <Column style={featuresBox}>
            <Text style={featuresHeading}>What&apos;s included:</Text>
            <Text style={featureText}>✓ Unlimited post scheduling</Text>
            <Text style={featureText}>✓ AI caption suggestions</Text>
            <Text style={featureText}>✓ Advanced analytics</Text>
            <Text style={featureText}>✓ Team collaboration</Text>
            <Text style={featureText}>✓ Priority support</Text>
          </Column>
        </Row>
      </Section>

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

const featuresBox = {
  margin: '32px 0',
  padding: '24px',
  border: '2px solid #10b981',
  borderRadius: '6px',
  borderLeft: '6px solid #10b981',
};

const featuresHeading = {
  color: '#059669',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '0 0 16px',
};

const featureText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '28px',
  margin: '8px 0',
  fontWeight: '500' as const,
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
  margin: '32px 0',
};

const signature = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
