/**
 * TikTok Creator Info API
 *
 * This service queries the TikTok Creator Info API to retrieve:
 * - Available privacy level options for the creator
 * - Maximum video duration allowed
 * - Current posting limits and quotas
 * - Disabled interaction features (comment, duet, stitch)
 *
 * IMPORTANT: This API MUST be called before rendering the post UI
 * to comply with TikTok's UX Guidelines for app approval.
 *
 * Reference: https://developers.tiktok.com/doc/content-posting-api-reference-creator-info-query
 */

const TIKTOK_CREATOR_INFO_URL = 'https://open.tiktokapis.com/v2/post/publish/creator_info/query/';

/**
 * Creator information returned from TikTok API
 */
export interface CreatorInfo {
  /** Creator's TikTok username */
  creator_username: string;

  /** Creator's avatar URL */
  creator_avatar_url: string;

  /** Available privacy level options for this creator */
  privacy_level_options: PrivacyLevel[];

  /** Whether comments are disabled for this creator */
  comment_disabled: boolean;

  /** Whether duet is disabled for this creator */
  duet_disabled: boolean;

  /** Whether stitch is disabled for this creator */
  stitch_disabled: boolean;

  /** Maximum video post duration in seconds */
  max_video_post_duration_sec: number;

  /** Whether the creator has reached posting limits */
  posting_limit_reached?: boolean;
}

/**
 * Privacy level options
 */
export type PrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'SELF_ONLY';

/**
 * Privacy level display labels
 */
export const PRIVACY_LEVEL_LABELS: Record<PrivacyLevel, { label: string; description: string }> = {
  PUBLIC_TO_EVERYONE: {
    label: 'Public',
    description: 'Everyone can see this video'
  },
  MUTUAL_FOLLOW_FRIENDS: {
    label: 'Friends',
    description: 'Only mutual friends can see'
  },
  FOLLOWER_OF_CREATOR: {
    label: 'Followers',
    description: 'Only your followers can see'
  },
  SELF_ONLY: {
    label: 'Private',
    description: 'Only you can see (saved as draft)'
  }
};

/**
 * Fetch creator information from TikTok API
 *
 * This MUST be called before rendering the post UI to:
 * - Get available privacy levels
 * - Check posting limits
 * - Determine which interactions are disabled
 * - Validate video duration limits
 *
 * @param accessToken - TikTok user access token
 * @returns Creator information
 * @throws Error if API call fails
 */
export async function fetchCreatorInfo(accessToken: string): Promise<CreatorInfo> {
  try {
    console.log('Fetching TikTok creator info...');

    const response = await fetch(TIKTOK_CREATOR_INFO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TikTok creator info error:', {
        status: response.status,
        error: errorData
      });

      const errorMessage = errorData.error?.message || errorData.message || 'Failed to fetch creator info';
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('TikTok creator info response:', data);

    const info = data.data;

    if (!info) {
      throw new Error('No creator info in response');
    }

    // Map the response to our interface
    const creatorInfo: CreatorInfo = {
      creator_username: info.creator_username || 'Unknown',
      creator_avatar_url: info.creator_avatar_url || '',
      privacy_level_options: info.privacy_level_options || ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
      comment_disabled: info.comment_disabled || false,
      duet_disabled: info.duet_disabled || false,
      stitch_disabled: info.stitch_disabled || false,
      max_video_post_duration_sec: info.max_video_post_duration_sec || 600, // Default 10 minutes
    };

    console.log('Parsed creator info:', creatorInfo);

    return creatorInfo;
  } catch (error) {
    console.error('Error fetching creator info:', error);
    throw error;
  }
}

/**
 * Validate video duration against creator's maximum allowed duration
 *
 * @param videoDurationSec - Video duration in seconds
 * @param creatorInfo - Creator information
 * @returns Error message if invalid, null if valid
 */
export function validateVideoDuration(
  videoDurationSec: number,
  creatorInfo: CreatorInfo
): string | null {
  if (videoDurationSec > creatorInfo.max_video_post_duration_sec) {
    return `Video too long. Maximum duration: ${creatorInfo.max_video_post_duration_sec} seconds (${Math.floor(creatorInfo.max_video_post_duration_sec / 60)} minutes)`;
  }

  if (videoDurationSec < 3) {
    return 'Video too short. Minimum duration: 3 seconds';
  }

  return null;
}

/**
 * Check if a privacy level is available for the creator
 *
 * @param privacyLevel - Privacy level to check
 * @param creatorInfo - Creator information
 * @returns true if available, false otherwise
 */
export function isPrivacyLevelAvailable(
  privacyLevel: PrivacyLevel,
  creatorInfo: CreatorInfo
): boolean {
  return creatorInfo.privacy_level_options.includes(privacyLevel);
}

/**
 * Validate commercial content settings with privacy level
 * Branded content (paid partnerships) cannot be posted with private visibility
 *
 * @param privacyLevel - Selected privacy level
 * @param hasBrandedContent - Whether branded content is enabled
 * @returns Error message if invalid, null if valid
 */
export function validateCommercialContentPrivacy(
  privacyLevel: PrivacyLevel,
  hasBrandedContent: boolean
): string | null {
  if (hasBrandedContent && privacyLevel === 'SELF_ONLY') {
    return 'Branded content visibility cannot be set to private. Please select Public or Friends.';
  }

  return null;
}
