import { Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';
import { APIIssue } from '@/lib/api-monitor/types';

interface APIDeprecationAlertEmailProps {
  issue: APIIssue;
  dashboardUrl: string;
}

export default function APIDeprecationAlertEmail({
  issue,
  dashboardUrl,
}: APIDeprecationAlertEmailProps) {
  const severityColors = {
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    critical: { bg: '#fecaca', border: '#dc2626', text: '#7f1d1d' },
  };

  const colors = severityColors[issue.severity] || severityColors.warning;

  const platformNames: Record<string, string> = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    threads: 'Threads',
    pinterest: 'Pinterest',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    bluesky: 'Bluesky',
  };

  const platformName = platformNames[issue.platform] || issue.platform;

  return (
    <EmailLayout preview={`[${issue.severity.toUpperCase()}] ${platformName} API Alert: ${issue.message}`}>
      <Heading style={h1}>API Alert</Heading>

      {/* Severity and Platform Badges */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ margin: '0 0 24px' }}>
        <tr>
          <td>
            <span style={{ ...badge, backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}>
              {issue.severity.toUpperCase()}
            </span>
            <span style={{ ...badge, backgroundColor: '#e0e7ff', color: '#3730a3', borderColor: '#6366f1', marginLeft: '8px' }}>
              {platformName}
            </span>
          </td>
        </tr>
      </table>

      <Text style={text}>
        An issue has been detected with the {platformName} API that requires your attention.
      </Text>

      {/* Issue Details Box */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={detailsBox}>
        <tr>
          <td style={{ ...detailsBoxInner, borderLeftColor: colors.border }}>
            <table width="100%" cellPadding="0" cellSpacing="0">
              <tr>
                <td style={labelCell}>Issue Type:</td>
                <td style={valueCell}>{formatIssueType(issue.type)}</td>
              </tr>
              <tr>
                <td style={labelCell}>Message:</td>
                <td style={valueCell}>{issue.message}</td>
              </tr>
              <tr>
                <td style={labelCell}>Detected:</td>
                <td style={valueCell}>{formatDate(issue.detectedAt)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {/* Technical Details Box */}
      {issue.details && Object.keys(issue.details).length > 0 && (
        <table width="100%" cellPadding="0" cellSpacing="0" style={messageBox}>
          <tr>
            <td style={messageBoxInner}>
              <Text style={messageLabel}>Technical Details:</Text>
              <Text style={codeText}>{JSON.stringify(issue.details, null, 2)}</Text>
            </td>
          </tr>
        </table>
      )}

      {/* Recommended Action Box */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={actionBox}>
        <tr>
          <td style={actionBoxInner}>
            <Text style={actionLabel}>Recommended Action:</Text>
            <Text style={actionText}>{issue.recommendedAction}</Text>
          </td>
        </tr>
      </table>

      {/* CTA Button */}
      <table width="100%" cellPadding="0" cellSpacing="0">
        <tr>
          <td align="center" style={{ padding: '24px 0' }}>
            <Button href={dashboardUrl} style={button}>
              View API Status Dashboard
            </Button>
          </td>
        </tr>
      </table>

      <Text style={footerNote}>
        This is an automated alert from the SocialCal API monitoring system.
        Alerts for the same issue are deduplicated for 24 hours.
      </Text>
    </EmailLayout>
  );
}

function formatIssueType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
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

const badge = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: '600' as const,
  border: '1px solid',
};

const detailsBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const detailsBoxInner = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  borderLeft: '4px solid #6366f1',
};

const labelCell = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600' as const,
  paddingBottom: '12px',
  paddingRight: '16px',
  verticalAlign: 'top' as const,
  width: '100px',
};

const valueCell = {
  color: '#1a1a1a',
  fontSize: '16px',
  paddingBottom: '12px',
  verticalAlign: 'top' as const,
};

const messageBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const messageBoxInner = {
  backgroundColor: '#1f2937',
  padding: '24px',
  borderRadius: '8px',
};

const messageLabel = {
  color: '#9ca3af',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
};

const codeText = {
  color: '#e5e7eb',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
  fontFamily: 'monospace',
};

const actionBox = {
  margin: '24px 0',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const actionBoxInner = {
  backgroundColor: '#ecfdf5',
  padding: '24px',
  border: '1px solid #10b981',
  borderRadius: '8px',
};

const actionLabel = {
  color: '#065f46',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
};

const actionText = {
  color: '#064e3b',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0',
};

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 0',
  fontStyle: 'italic' as const,
};
