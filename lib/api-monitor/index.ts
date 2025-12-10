/**
 * API Version Monitoring System - Main Entry Point
 *
 * Monitors social platform APIs for deprecation warnings, unexpected responses,
 * and other issues that could affect the application.
 */

export { API_CONFIGS, getAPIConfig, getAllAPIConfigs, getUpcomingDeprecations, getActiveDeprecations, getDaysUntilDeprecation } from './config';
export { detectAPIIssues, detectMetricAnomaly, createDetectionContext, createResponseForDetection } from './detector';
export { sendAPIAlert, getRecentAlerts, cleanupExpiredAlerts } from './alerts';
export type { APIIssue, AlertSeverity, IssueType, DeprecationInfo, PlatformAPIConfig, DetectionContext, APIResponseForDetection, AlertRecord } from './types';

/**
 * Convenience function to monitor a fetch response and send alerts for any detected issues.
 * This is a non-blocking operation - it logs any errors but doesn't interrupt the main flow.
 *
 * @param platform - The platform name (instagram, facebook, threads, etc.)
 * @param endpoint - The API endpoint being called
 * @param response - The fetch Response object
 * @param requestedMetrics - Optional array of metrics being requested
 */
export async function monitorAPIResponse(
  platform: string,
  endpoint: string,
  response: Response,
  requestedMetrics?: string[]
): Promise<void> {
  try {
    const { createDetectionContext, createResponseForDetection, detectAPIIssues } = await import('./detector');
    const { sendAPIAlert } = await import('./alerts');

    const context = createDetectionContext(platform, endpoint, requestedMetrics);
    const responseForDetection = await createResponseForDetection(response);

    const issues = detectAPIIssues(context, responseForDetection);

    // Send alerts for all detected issues (async, non-blocking)
    for (const issue of issues) {
      sendAPIAlert(issue).catch((error) => {
        console.error('[API Monitor] Failed to send alert:', error);
      });
    }
  } catch (error) {
    // Log but don't throw - monitoring should never interrupt the main flow
    console.error('[API Monitor] Error monitoring response:', error);
  }
}
