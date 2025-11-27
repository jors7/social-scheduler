import { Text, Heading, Link } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface NewUserAdminEmailProps {
  userEmail: string;
  planName: string;
  billingCycle: string;
  isTrial: boolean;
  signupDate: string;
}

export default function NewUserAdminEmail({
  userEmail,
  planName,
  billingCycle,
  isTrial,
  signupDate,
}: NewUserAdminEmailProps) {
  return (
    <EmailLayout preview={`New signup: ${userEmail}`}>
      <Heading style={h1}>New User Signup</Heading>

      <Text style={text}>
        A new user has signed up for SocialCal!
      </Text>

      {/* User Details Box */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={detailsBox}>
        <tr>
          <td style={detailsBoxInner}>
            <table width="100%" cellPadding="0" cellSpacing="0">
              <tr>
                <td style={labelCell}>Email:</td>
                <td style={valueCell}>
                  <Link href={`mailto:${userEmail}`} style={emailLink}>
                    {userEmail}
                  </Link>
                </td>
              </tr>
              <tr>
                <td style={labelCell}>Plan:</td>
                <td style={valueCell}>{planName}</td>
              </tr>
              <tr>
                <td style={labelCell}>Billing:</td>
                <td style={valueCell}>{billingCycle}</td>
              </tr>
              <tr>
                <td style={labelCell}>Status:</td>
                <td style={valueCell}>
                  <span style={isTrial ? trialBadge : activeBadge}>
                    {isTrial ? '7-day Trial' : 'Active'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={labelCell}>Signed up:</td>
                <td style={valueCell}>{signupDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={footerNote}>
        View all users in the <Link href="https://www.socialcal.app/admin/users" style={emailLink}>admin dashboard</Link>
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
  backgroundColor: '#f0fdf4',
  padding: '24px',
  borderLeft: '4px solid #22c55e',
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

const trialBadge = {
  backgroundColor: '#fef3c7',
  color: '#d97706',
  padding: '4px 12px',
  borderRadius: '9999px',
  fontSize: '14px',
  fontWeight: '600' as const,
};

const activeBadge = {
  backgroundColor: '#dcfce7',
  color: '#16a34a',
  padding: '4px 12px',
  borderRadius: '9999px',
  fontSize: '14px',
  fontWeight: '600' as const,
};

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 0',
};
