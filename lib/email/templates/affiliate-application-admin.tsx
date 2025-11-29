import { Text, Heading, Link } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface AffiliateApplicationAdminEmailProps {
  applicant_name: string;
  applicant_email: string;
  application_id: string;
  audience_size: string;
  primary_platform: string;
}

export default function AffiliateApplicationAdminEmail({
  applicant_name,
  applicant_email,
  application_id,
  audience_size,
  primary_platform,
}: AffiliateApplicationAdminEmailProps) {
  return (
    <EmailLayout preview={`New affiliate application from ${applicant_name}`}>
      <Heading style={h1}>New Affiliate Application</Heading>

      <Text style={text}>
        Someone has applied to join the SocialCal Affiliate Program!
      </Text>

      {/* Application Details Box */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={detailsBox}>
        <tr>
          <td style={detailsBoxInner}>
            <table width="100%" cellPadding="0" cellSpacing="0">
              <tr>
                <td style={labelCell}>Name:</td>
                <td style={valueCell}>{applicant_name}</td>
              </tr>
              <tr>
                <td style={labelCell}>Email:</td>
                <td style={valueCell}>
                  <Link href={`mailto:${applicant_email}`} style={emailLink}>
                    {applicant_email}
                  </Link>
                </td>
              </tr>
              <tr>
                <td style={labelCell}>Audience:</td>
                <td style={valueCell}>{audience_size}</td>
              </tr>
              <tr>
                <td style={labelCell}>Platform:</td>
                <td style={valueCell}>{primary_platform}</td>
              </tr>
              <tr>
                <td style={labelCell}>Status:</td>
                <td style={valueCell}>
                  <span style={pendingBadge}>Pending Review</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={text}>
        Review this application and approve or reject it in the admin dashboard.
      </Text>

      <table width="100%" cellPadding="0" cellSpacing="0">
        <tr>
          <td>
            <Link href="https://www.socialcal.app/admin/affiliates" style={button}>
              Review Application
            </Link>
          </td>
        </tr>
      </table>

      <Text style={footerNote}>
        Application ID: {application_id}
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

const detailsBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const detailsBoxInner = {
  backgroundColor: '#faf5ff',
  padding: '24px',
  borderLeft: '4px solid #a855f7',
};

const labelCell = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600' as const,
  paddingBottom: '12px',
  paddingRight: '16px',
  verticalAlign: 'top' as const,
  width: '80px',
};

const valueCell = {
  color: '#1a1a1a',
  fontSize: '16px',
  paddingBottom: '12px',
  verticalAlign: 'top' as const,
};

const emailLink = {
  color: '#6366f1',
  textDecoration: 'underline',
};

const pendingBadge = {
  backgroundColor: '#fef3c7',
  color: '#d97706',
  padding: '4px 12px',
  borderRadius: '9999px',
  fontSize: '14px',
  fontWeight: '600' as const,
};

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '14px 28px',
  textDecoration: 'none',
};

const footerNote = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '22px',
  margin: '24px 0 0',
};
