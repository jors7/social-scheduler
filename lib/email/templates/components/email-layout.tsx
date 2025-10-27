import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
} from '@react-email/components';
import { ReactNode } from 'react';
import { EmailHeader } from './email-header';
import { EmailFooter } from './email-footer';

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />
          <table width="100%" cellPadding="0" cellSpacing="0">
            <tr>
              <td style={content}>
                {children}
              </td>
            </tr>
          </table>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  marginBottom: '0',
  maxWidth: '600px',
  border: '1px solid #e6ebf1',
};

const content = {
  padding: '40px 48px',
};
