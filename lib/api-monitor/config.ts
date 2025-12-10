/**
 * API Version Monitoring System - Centralized Configuration
 *
 * This file serves as the single source of truth for API versions
 * and known deprecations across all social media platforms.
 */

import { PlatformAPIConfig, DeprecationInfo } from './types';

export const API_CONFIGS: Record<string, PlatformAPIConfig> = {
  instagram: {
    platform: 'instagram',
    currentVersion: 'v22.0',
    baseUrl: 'https://graph.instagram.com',
    deprecations: [
      {
        id: 'instagram-plays-to-views',
        metric: 'plays',
        replacedBy: 'views',
        deprecationDate: '2025-04-21',
        status: 'deprecated',
        notes: 'All content types now use views metric instead of plays'
      }
    ],
    expectedMetrics: ['reach', 'saved', 'total_interactions', 'views']
  },

  facebook: {
    platform: 'facebook',
    currentVersion: 'v21.0',
    baseUrl: 'https://graph.facebook.com',
    deprecations: [
      {
        id: 'facebook-post-impressions-to-media-view',
        metric: 'post_impressions',
        replacedBy: 'page_media_view',
        deprecationDate: '2025-11-15',
        status: 'deprecated',
        notes: 'page_impressions also deprecated - use page_media_view instead'
      }
    ],
    expectedMetrics: ['post_media_view']
  },

  threads: {
    platform: 'threads',
    currentVersion: 'v1.0',
    baseUrl: 'https://graph.threads.net',
    deprecations: [],
    expectedMetrics: ['views', 'likes', 'replies', 'reposts', 'quotes']
  },

  pinterest: {
    platform: 'pinterest',
    currentVersion: 'v5',
    baseUrl: 'https://api.pinterest.com',
    deprecations: [],
    expectedMetrics: ['PIN_CLICK', 'IMPRESSION', 'SAVE', 'OUTBOUND_CLICK']
  },

  youtube: {
    platform: 'youtube',
    currentVersion: 'v3',
    baseUrl: 'https://www.googleapis.com/youtube',
    deprecations: [],
    expectedMetrics: ['viewCount', 'likeCount', 'commentCount']
  },

  tiktok: {
    platform: 'tiktok',
    currentVersion: 'v2',
    baseUrl: 'https://open.tiktokapis.com',
    deprecations: [],
    expectedMetrics: ['like_count', 'comment_count', 'share_count', 'view_count']
  },

  bluesky: {
    platform: 'bluesky',
    currentVersion: '@atproto/api',
    baseUrl: 'https://bsky.social',
    deprecations: [],
    expectedMetrics: [],
    notes: 'Uses @atproto/api npm package - version managed via package.json'
  }
};

/**
 * Get configuration for a specific platform
 */
export function getAPIConfig(platform: string): PlatformAPIConfig | undefined {
  return API_CONFIGS[platform.toLowerCase()];
}

/**
 * Get all platform configurations
 */
export function getAllAPIConfigs(): PlatformAPIConfig[] {
  return Object.values(API_CONFIGS);
}

/**
 * Get deprecations that are upcoming or recently deprecated (within 30 days)
 */
export function getUpcomingDeprecations(): Array<DeprecationInfo & { platform: string }> {
  const upcoming: Array<DeprecationInfo & { platform: string }> = [];
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const [platform, config] of Object.entries(API_CONFIGS)) {
    for (const dep of config.deprecations) {
      const depDate = new Date(dep.deprecationDate);
      // Include if within 30 days before or after deprecation date
      if (depDate >= thirtyDaysAgo && depDate <= thirtyDaysFromNow) {
        upcoming.push({ ...dep, platform });
      }
    }
  }

  return upcoming.sort(
    (a, b) => new Date(a.deprecationDate).getTime() - new Date(b.deprecationDate).getTime()
  );
}

/**
 * Get all active deprecations (status is 'deprecated' or 'upcoming')
 */
export function getActiveDeprecations(): Array<DeprecationInfo & { platform: string }> {
  const active: Array<DeprecationInfo & { platform: string }> = [];

  for (const [platform, config] of Object.entries(API_CONFIGS)) {
    for (const dep of config.deprecations) {
      if (dep.status !== 'removed') {
        active.push({ ...dep, platform });
      }
    }
  }

  return active.sort(
    (a, b) => new Date(a.deprecationDate).getTime() - new Date(b.deprecationDate).getTime()
  );
}

/**
 * Calculate days until/since deprecation
 */
export function getDaysUntilDeprecation(deprecationDate: string): number {
  const depDate = new Date(deprecationDate);
  const now = new Date();
  return Math.ceil((depDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
