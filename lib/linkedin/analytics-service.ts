/**
 * LinkedIn Analytics Service
 *
 * ⚠️ PENDING APPROVAL - This service is ready but not yet active
 * LinkedIn Community Management API approval is required before use
 * Application submitted - awaiting approval (typically 1-2 weeks)
 *
 * Provides access to LinkedIn analytics through the Community Management API
 * Supports both Member Post Analytics and Organization Page Statistics
 *
 * API Documentation:
 * - Member Post Analytics: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics
 * - Organization Stats: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/page-statistics
 *
 * Required Scopes (DO NOT enable in OAuth until approved):
 * - r_member_postAnalytics (Member post analytics)
 * - rw_organization_admin (Organization page analytics, requires admin role)
 *
 * @status INACTIVE - Awaiting LinkedIn API approval
 * @see docs/LINKEDIN_API_SETUP.md for activation instructions
 */

export interface LinkedInAnalyticsConfig {
  accessToken: string;
  linkedinVersion?: string; // Format: YYYYMM (e.g., '202501')
}

export type MetricType = 'IMPRESSION' | 'MEMBERS_REACHED' | 'RESHARE' | 'REACTION' | 'COMMENT';
export type AggregationType = 'TOTAL' | 'DAILY';

export interface MemberPostAnalyticsParams {
  postUrn: string; // Format: urn:li:ugcPost:123456789 or urn:li:share:123456789
  queryType: MetricType;
  aggregation?: AggregationType;
}

export interface AggregatedMemberAnalyticsParams {
  queryType: MetricType;
  aggregation?: AggregationType;
  startDate?: Date;
  endDate?: Date;
}

export interface AnalyticsResult {
  count: number;
  metricType: MetricType;
  targetEntity?: string;
  dateRange?: {
    start: { year: number; month: number; day: number };
    end: { year: number; month: number; day: number };
  };
}

export interface OrganizationPageStatsParams {
  organizationUrn: string; // Format: urn:li:organization:123456
  timeGranularity?: 'DAY' | 'MONTH';
  startTime?: number; // Timestamp in milliseconds
  endTime?: number;
}

export interface OrganizationPageStats {
  views: {
    allPageViews: {
      pageViews: number;
      uniquePageViews?: number;
      mobilePageViews?: {
        pageViews: number;
      };
      desktopPageViews?: {
        pageViews: number;
      };
    };
  };
  clicks?: {
    careersPageClicks?: number;
    customButtonClicks?: number;
  };
}

export class LinkedInAnalyticsService {
  private accessToken: string;
  private apiVersion: string;
  private baseUrl = 'https://api.linkedin.com/rest';

  constructor(config: LinkedInAnalyticsConfig) {
    this.accessToken = config.accessToken;
    // Default to latest version as of 2025
    this.apiVersion = config.linkedinVersion || '202501';
  }

  /**
   * Get analytics for a single member post
   * Retrieves specific metrics (impressions, engagement, etc.) for one post
   */
  async getMemberPostAnalytics(params: MemberPostAnalyticsParams): Promise<AnalyticsResult[]> {
    try {
      const url = new URL(`${this.baseUrl}/memberCreatorPostAnalytics`);
      url.searchParams.append('q', 'entity');
      url.searchParams.append('entity', params.postUrn);
      url.searchParams.append('queryType', params.queryType);

      if (params.aggregation) {
        url.searchParams.append('aggregation', params.aggregation);
      }

      console.log('LinkedIn Member Post Analytics request:', {
        url: url.toString(),
        postUrn: params.postUrn,
        queryType: params.queryType
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': this.apiVersion,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LinkedIn Member Post Analytics failed:', response.status, errorText);
        throw new Error(`Failed to fetch member post analytics: ${response.statusText}`);
      }

      const data = await response.json();

      // API returns { elements: [...] } format
      return data.elements || [];
    } catch (error) {
      console.error('LinkedIn Member Post Analytics error:', error);
      throw error;
    }
  }

  /**
   * Get aggregated analytics for all member posts
   * Retrieves metrics across all posts for the authenticated member
   */
  async getAggregatedMemberAnalytics(params: AggregatedMemberAnalyticsParams): Promise<AnalyticsResult[]> {
    try {
      const url = new URL(`${this.baseUrl}/memberCreatorPostAnalytics`);
      url.searchParams.append('q', 'me');
      url.searchParams.append('queryType', params.queryType);

      if (params.aggregation) {
        url.searchParams.append('aggregation', params.aggregation);
      }

      // Note: Date range filters may be available depending on API version
      // Check LinkedIn documentation for date filtering support

      console.log('LinkedIn Aggregated Member Analytics request:', {
        url: url.toString(),
        queryType: params.queryType,
        aggregation: params.aggregation
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': this.apiVersion,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LinkedIn Aggregated Analytics failed:', response.status, errorText);
        throw new Error(`Failed to fetch aggregated analytics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.elements || [];
    } catch (error) {
      console.error('LinkedIn Aggregated Analytics error:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics for a single post
   * Fetches all available metrics (impressions, engagement, etc.) in one call
   */
  async getPostMetrics(postUrn: string): Promise<Record<MetricType, number>> {
    const metricTypes: MetricType[] = ['IMPRESSION', 'MEMBERS_REACHED', 'RESHARE', 'REACTION', 'COMMENT'];
    const metrics: Record<string, number> = {};

    // Fetch all metrics in parallel
    const results = await Promise.allSettled(
      metricTypes.map(async (metricType) => {
        const analytics = await this.getMemberPostAnalytics({
          postUrn,
          queryType: metricType,
          aggregation: 'TOTAL'
        });
        return { metricType, value: analytics[0]?.count || 0 };
      })
    );

    // Process results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        metrics[result.value.metricType] = result.value.value;
      } else {
        console.error('Failed to fetch metric:', result.reason);
      }
    });

    return metrics as Record<MetricType, number>;
  }

  /**
   * Get organization page statistics
   * Requires admin role on the organization page
   */
  async getOrganizationPageStats(params: OrganizationPageStatsParams): Promise<OrganizationPageStats> {
    try {
      const url = new URL(`${this.baseUrl}/organizationPageStatistics`);
      url.searchParams.append('organization', params.organizationUrn);

      // Add time intervals if provided
      if (params.timeGranularity && params.startTime && params.endTime) {
        const timeIntervals = {
          timeGranularityType: params.timeGranularity,
          timeRange: {
            start: params.startTime,
            end: params.endTime
          }
        };
        url.searchParams.append('timeIntervals', JSON.stringify(timeIntervals));
      }

      console.log('LinkedIn Organization Page Stats request:', {
        url: url.toString(),
        organizationUrn: params.organizationUrn
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': this.apiVersion,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LinkedIn Organization Stats failed:', response.status, errorText);
        throw new Error(`Failed to fetch organization stats: ${response.statusText}`);
      }

      const data = await response.json();
      return data.elements?.[0] || {};
    } catch (error) {
      console.error('LinkedIn Organization Stats error:', error);
      throw error;
    }
  }

  /**
   * Get follower statistics for an organization
   * Provides follower growth and demographic data
   */
  async getOrganizationFollowerStats(organizationUrn: string): Promise<any> {
    try {
      const url = new URL(`${this.baseUrl}/organizationalEntityFollowerStatistics`);
      url.searchParams.append('q', 'organizationalEntity');
      url.searchParams.append('organizationalEntity', organizationUrn);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': this.apiVersion,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LinkedIn Follower Stats failed:', response.status, errorText);
        throw new Error(`Failed to fetch follower stats: ${response.statusText}`);
      }

      const data = await response.json();
      return data.elements || [];
    } catch (error) {
      console.error('LinkedIn Follower Stats error:', error);
      throw error;
    }
  }

  /**
   * Check if the access token has analytics permissions
   */
  async validateAnalyticsAccess(): Promise<{
    hasMemberAnalytics: boolean;
    hasOrganizationAnalytics: boolean;
  }> {
    const result = {
      hasMemberAnalytics: false,
      hasOrganizationAnalytics: false
    };

    // Test member analytics access
    try {
      await this.getAggregatedMemberAnalytics({
        queryType: 'IMPRESSION',
        aggregation: 'TOTAL'
      });
      result.hasMemberAnalytics = true;
    } catch (error) {
      console.log('Member analytics not available:', error);
    }

    return result;
  }

  /**
   * Helper: Convert date to LinkedIn time format (milliseconds)
   */
  static dateToLinkedInTime(date: Date): number {
    return date.getTime();
  }

  /**
   * Helper: Format post URN
   */
  static formatPostUrn(postId: string, type: 'ugcPost' | 'share' = 'ugcPost'): string {
    // Remove existing URN prefix if present
    const cleanId = postId.replace(/^urn:li:(ugcPost|share):/, '');
    return `urn:li:${type}:${cleanId}`;
  }

  /**
   * Helper: Format organization URN
   */
  static formatOrganizationUrn(orgId: string): string {
    const cleanId = orgId.replace(/^urn:li:organization:/, '');
    return `urn:li:organization:${cleanId}`;
  }
}
