import { Section, Heading } from '@react-email/components';

export function EmailHeader() {
  return (
    <>
      <Section style={brandBar} />
      <Section style={header}>
        <Heading style={heading}>SocialCal</Heading>
      </Section>
    </>
  );
}

const brandBar = {
  height: '4px',
  backgroundColor: '#6366f1',
  margin: '0',
  padding: '0',
};

const header = {
  padding: '32px 48px 24px',
  borderBottom: '1px solid #e6ebf1',
  backgroundColor: '#ffffff',
};

const heading = {
  margin: '0',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  letterSpacing: '-0.5px',
};
