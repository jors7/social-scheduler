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
  color: '#111827',
  fontSize: '28px',
  fontWeight: '700' as const,
  margin: '0 0 24px',
  lineHeight: '1.3',
  letterSpacing: '-0.02em',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '0 0 20px',
};

const featuresBox = {
  margin: '28px 0',
  padding: '28px 24px',
  border: '2px solid #d1fae5',
  borderRadius: '8px',
  borderLeft: '5px solid #10b981',
};

const featuresHeading = {
  color: '#065f46',
  fontSize: '17px',
  fontWeight: '700' as const,
  margin: '0 0 18px',
};

const featureText = {
  color: '#111827',
  fontSize: '15px',
  lineHeight: '30px',
  margin: '0',
  fontWeight: '500' as const,
};

const button = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  margin: '28px 0',
};

const signature = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
