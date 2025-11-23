import { Text, Heading } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface AffiliateApplicationRejectedProps {
  first_name: string;
  rejection_reason: string;
}

export default function AffiliateApplicationRejected({
  first_name,
  rejection_reason,
}: AffiliateApplicationRejectedProps) {
  return (
    <EmailLayout preview="Update on your SocialCal Affiliate application">
      <Heading style={h1}>Thank You for Your Interest</Heading>

      <Text style={text}>
        Hi {first_name},
      </Text>

      <Text style={text}>
        Thank you for your interest in joining the SocialCal Affiliate Program. After careful review, we&apos;ve decided not to move forward with your application at this time.
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={infoBox}>
        <tr>
          <td style={infoBoxInner}>
            <Text style={infoTitle}>Reason:</Text>
            <Text style={reasonText}>{rejection_reason}</Text>
          </td>
        </tr>
      </table>

      <Text style={text}>
        We appreciate your interest in partnering with us. If your situation changes or you&apos;d like to discuss this decision further, please don&apos;t hesitate to reach out to our team.
      </Text>

      <Text style={text}>
        In the meantime, we&apos;d love for you to try SocialCal for your own social media management needs. As a valued community member, you can still enjoy all the benefits of our platform!
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
  backgroundColor: '#fef2f2',
  padding: '24px',
  borderLeft: '4px solid #ef4444',
};

const infoTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
};

const reasonText = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0',
  fontStyle: 'italic' as const,
};

const signature = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '32px 0 0',
};
