/**
 * API Version Monitoring System - Detection Logic
 *
 * Analyzes API responses for deprecation warnings, unexpected responses,
 * and other issues that should trigger admin alerts.
 */

import { APIIssue, DetectionContext, APIResponseForDetection } from './types';
import { getAPIConfig } from './config';

/**
 * Analyze an API response for potential issues
 */
export function detectAPIIssues(
  context: DetectionContext,
  response: APIResponseForDetection
): APIIssue[] {
  const issues: APIIssue[] = [];
  const config = getAPIConfig(context.platform);

  if (!config) {
    return issues;
  }

  // 1. Check for deprecation headers (Meta platforms use these)
  const deprecationIssue = checkDeprecationHeaders(context, response);
  if (deprecationIssue) {
    issues.push(deprecationIssue);
  }

  // 2. Check for error responses indicating deprecation
  const errorIssue = checkDeprecationErrors(context, response);
  if (errorIssue) {
    issues.push(errorIssue);
  }

  // 3. Check for unexpected response structure (missing metrics)
  const structureIssue = checkResponseStructure(context, response, config.expectedMetrics);
  if (structureIssue) {
    issues.push(structureIssue);
  }

  // Log detected issues
  for (const issue of issues) {
    console.log(`[API Monitor] Issue detected: ${issue.platform} - ${issue.type} - ${issue.message}`);
  }

  return issues;
}

/**
 * Check for deprecation warning headers from Meta APIs
 * Meta uses x-fb-api-version-deprecation and x-fb-warning headers
 */
function checkDeprecationHeaders(
  context: DetectionContext,
  response: APIResponseForDetection
): APIIssue | null {
  // Try to get headers - handle both Headers object and plain object
  let deprecationHeader: string | null = null;
  let warningHeader: string | null = null;

  try {
    if (response.headers instanceof Headers) {
      deprecationHeader = response.headers.get('x-fb-api-version-deprecation');
      warningHeader = response.headers.get('x-fb-warning');
    } else if (response.headers && typeof response.headers === 'object') {
      // Handle plain object headers
      const headers = response.headers as Record<string, string>;
      deprecationHeader = headers['x-fb-api-version-deprecation'] || null;
      warningHeader = headers['x-fb-warning'] || null;
    }
  } catch {
    // Headers not accessible, skip this check
    return null;
  }

  if (!deprecationHeader && !warningHeader) {
    return null;
  }

  return {
    id: `${context.platform}-deprecation-header-${context.endpoint.replace(/[^a-z0-9]/gi, '-')}`,
    platform: context.platform,
    severity: 'warning',
    type: 'deprecation_warning',
    message: 'API deprecation warning header received from platform',
    details: {
      deprecationHeader,
      warningHeader,
      endpoint: context.endpoint
    },
    detectedAt: new Date(),
    recommendedAction: `Review ${context.platform} API documentation for migration path. Check if API version needs to be updated.`
  };
}

/**
 * Check for error responses that indicate deprecation
 */
function checkDeprecationErrors(
  context: DetectionContext,
  response: APIResponseForDetection
): APIIssue | null {
  // Only check error responses
  if (response.status !== 400 && response.status !== 410 && response.status !== 404) {
    return null;
  }

  const errorMessage = getErrorMessage(response);
  if (!errorMessage) {
    return null;
  }

  // Common deprecation error patterns
  const deprecationPatterns = [
    /deprecated/i,
    /no longer supported/i,
    /removed/i,
    /use .+ instead/i,
    /migration required/i,
    /invalid.*metric/i,
    /unknown.*metric/i,
    /parameter.*not.*valid/i
  ];

  for (const pattern of deprecationPatterns) {
    if (pattern.test(errorMessage)) {
      return {
        id: `${context.platform}-deprecated-${context.endpoint.replace(/[^a-z0-9]/gi, '-')}`,
        platform: context.platform,
        severity: 'error',
        type: 'deprecation_warning',
        message: 'Deprecated API endpoint or parameter detected',
        details: {
          endpoint: context.endpoint,
          statusCode: response.status,
          errorMessage,
          errorCode: response.body?.error?.code,
          requestedMetrics: context.requestedMetrics
        },
        detectedAt: new Date(),
        recommendedAction: 'Update API calls to use replacement endpoint or parameters. Check platform changelog for migration guide.'
      };
    }
  }

  return null;
}

/**
 * Check if expected metrics are missing from response
 */
function checkResponseStructure(
  context: DetectionContext,
  response: APIResponseForDetection,
  expectedMetrics: string[]
): APIIssue | null {
  // Only check successful responses
  if (response.status !== 200 || !response.body) {
    return null;
  }

  // Only check if we have specific metrics we're looking for
  if (!context.requestedMetrics || context.requestedMetrics.length === 0) {
    return null;
  }

  const receivedMetrics = extractMetricNames(response.body);

  // Check if any requested metrics that are in expectedMetrics are missing
  const missingExpected = context.requestedMetrics.filter(
    m => expectedMetrics.includes(m) && !receivedMetrics.includes(m)
  );

  if (missingExpected.length === 0) {
    return null;
  }

  // Only alert if a significant portion of expected metrics are missing
  const missingRatio = missingExpected.length / context.requestedMetrics.length;
  if (missingRatio < 0.5) {
    // Less than half missing, might be normal
    return null;
  }

  return {
    id: `${context.platform}-missing-metrics-${missingExpected.sort().join('-')}`,
    platform: context.platform,
    severity: 'warning',
    type: 'unexpected_response',
    message: `Expected metrics missing from API response: ${missingExpected.join(', ')}`,
    details: {
      endpoint: context.endpoint,
      requested: context.requestedMetrics,
      received: receivedMetrics,
      missing: missingExpected
    },
    detectedAt: new Date(),
    recommendedAction: 'Check if metrics have been renamed, deprecated, or require different permissions.'
  };
}

/**
 * Check for metrics that consistently return zero (anomaly detection)
 * Call this after aggregating multiple responses
 */
export function detectMetricAnomaly(
  platform: string,
  metricName: string,
  values: number[],
  sampleSize: number = 10
): APIIssue | null {
  if (values.length < sampleSize) {
    return null;
  }

  // Check if all values are 0
  const allZero = values.every(v => v === 0);
  if (!allZero) {
    return null;
  }

  return {
    id: `${platform}-metric-anomaly-${metricName}-all-zero`,
    platform,
    severity: 'warning',
    type: 'metric_anomaly',
    message: `Metric '${metricName}' consistently returning 0 across ${values.length} samples`,
    details: {
      metric: metricName,
      sampleSize: values.length,
      possibleCauses: [
        'Metric may have been deprecated',
        'Permission scope may have changed',
        'API version mismatch',
        'Account has no activity for this metric'
      ]
    },
    detectedAt: new Date(),
    recommendedAction: 'Verify metric is still supported in current API version. Check if permissions need to be re-requested.'
  };
}

/**
 * Extract error message from response
 */
function getErrorMessage(response: APIResponseForDetection): string | null {
  if (response.errorText) {
    return response.errorText;
  }

  if (response.body?.error?.message) {
    return response.body.error.message;
  }

  if (response.body?.error) {
    return typeof response.body.error === 'string'
      ? response.body.error
      : JSON.stringify(response.body.error);
  }

  return null;
}

/**
 * Extract metric names from various API response formats
 */
function extractMetricNames(body: any): string[] {
  const metrics: string[] = [];

  // Meta format: { data: [{ name: 'metric_name', ... }] }
  if (Array.isArray(body.data)) {
    for (const item of body.data) {
      if (item.name) {
        metrics.push(item.name);
      }
    }
  }

  // Pinterest format: { daily_metrics: [{ metrics: { METRIC_NAME: value } }] }
  if (body.daily_metrics && Array.isArray(body.daily_metrics)) {
    const firstDay = body.daily_metrics[0];
    if (firstDay?.metrics) {
      metrics.push(...Object.keys(firstDay.metrics));
    }
  }

  // YouTube format: { statistics: { viewCount, likeCount, ... } }
  if (body.statistics) {
    metrics.push(...Object.keys(body.statistics));
  }

  // Generic: if body has named properties that look like metrics
  if (typeof body === 'object' && !Array.isArray(body)) {
    for (const key of Object.keys(body)) {
      if (typeof body[key] === 'number') {
        metrics.push(key);
      }
    }
  }

  return metrics;
}

/**
 * Create a detection context helper
 */
export function createDetectionContext(
  platform: string,
  endpoint: string,
  requestedMetrics?: string[]
): DetectionContext {
  return {
    platform,
    endpoint,
    requestedMetrics
  };
}

/**
 * Create an API response object for detection from fetch response
 */
export async function createResponseForDetection(
  response: Response,
  clonedBody?: any
): Promise<APIResponseForDetection> {
  let body = clonedBody;
  let errorText: string | undefined;

  if (!body) {
    try {
      const text = await response.clone().text();
      try {
        body = JSON.parse(text);
      } catch {
        errorText = text;
      }
    } catch {
      // Could not read body
    }
  }

  return {
    status: response.status,
    headers: response.headers,
    body,
    errorText
  };
}
