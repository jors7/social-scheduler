import { Section, Img, Heading } from '@react-email/components';

export function EmailHeader() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';

  return (
    <Section style={header}>
      <Heading style={heading}>SocialCal</Heading>
    </Section>
  );
}

const header = {
  padding: '32px 48px',
  borderBottom: '1px solid #e6ebf1',
};

const heading = {
  margin: '0',
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  letterSpacing: '-0.5px',
};
