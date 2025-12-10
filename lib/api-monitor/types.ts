/**
 * API Version Monitoring System - Type Definitions
 */

export type AlertSeverity = 'warning' | 'error' | 'critical';

export type IssueType =
  | 'deprecation_warning'
  | 'unexpected_response'
  | 'metric_anomaly'
  | 'version_mismatch'
  | 'api_error';

export interface APIIssue {
  id: string;                    // Unique identifier for deduplication
  platform: string;
  severity: AlertSeverity;
  type: IssueType;
  message: string;
  details: Record<string, any>;
  detectedAt: Date;
  recommendedAction: string;
}

export interface DeprecationInfo {
  id: string;                    // Unique identifier for deduplication
  metric: string;                // e.g., 'plays', 'post_impressions'
  replacedBy: string;            // e.g., 'views', 'page_media_view'
  deprecationDate: string;       // ISO date string
  status: 'upcoming' | 'deprecated' | 'removed';
  notes?: string;
}

export interface PlatformAPIConfig {
  platform: string;
  currentVersion: string;
  baseUrl: string;
  deprecations: DeprecationInfo[];
  expectedMetrics: string[];     // Metrics we expect to receive
  notes?: string;
}

export interface DetectionContext {
  platform: string;
  endpoint: string;
  requestedMetrics?: string[];
}

export interface APIResponseForDetection {
  status: number;
  headers: Headers;
  body: any;
  errorText?: string;
}

export interface AlertRecord {
  id: string;
  issue_id: string;
  platform: string;
  severity: AlertSeverity;
  issue_type: IssueType;
  message: string;
  details: Record<string, any>;
  recommended_action: string;
  alerted_at: string;
  expires_at: string;
}
