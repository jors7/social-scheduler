import { Section } from '@react-email/components';

export function EmailHeader() {
  return (
    <Section style={brandBar} />
  );
}

const brandBar = {
  height: '4px',
  backgroundColor: '#6366f1',
  margin: '0',
  padding: '0',
};
