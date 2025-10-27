import { Section, Text, Link, Hr } from '@react-email/components';

export function EmailFooter() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Hr style={hr} />
      <Section style={footer}>
        <Text style={footerText}>
          <Link href={`${appUrl}/dashboard`} style={footerLink}>
            Dashboard
          </Link>
          {' • '}
          <Link href={`${appUrl}/support`} style={footerLink}>
            Support
          </Link>
          {' • '}
          <Link href={`${appUrl}/privacy`} style={footerLink}>
            Privacy
          </Link>
        </Text>
        <Text style={footerText}>
          © {currentYear} SocialCal. All rights reserved.
        </Text>
        <Text style={footerAddress}>
          SocialCal - Social Media Scheduling Made Simple
        </Text>
      </Section>
    </>
  );
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  padding: '0 48px',
  textAlign: 'center' as const,
};

const footerText = {
  margin: '12px 0',
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
};

const footerLink = {
  color: '#8898aa',
  textDecoration: 'underline',
};

const footerAddress = {
  margin: '4px 0 0 0',
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};
