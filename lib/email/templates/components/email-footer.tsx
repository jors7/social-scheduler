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
  margin: '40px 48px 32px',
};

const footer = {
  padding: '0 48px 40px',
  textAlign: 'center' as const,
  backgroundColor: '#ffffff',
};

const footerText = {
  margin: '12px 0',
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
};

const footerLink = {
  color: '#6366f1',
  textDecoration: 'none',
  fontWeight: '500' as const,
};

const footerAddress = {
  margin: '16px 0 0 0',
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '20px',
};
