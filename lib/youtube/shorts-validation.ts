/**
 * YouTube Shorts Validation
 * Validates video requirements for YouTube Shorts
 */

import { VideoMetadata, formatDuration, formatAspectRatio, formatDimensions } from '@/lib/utils/video-metadata';

export type ValidationIssueType = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  type: ValidationIssueType;
  message: string;
}

export interface ShortsValidationResult {
  valid: boolean;           // Can be posted as Short
  issues: ValidationIssue[]; // List of problems/warnings
  canProceed: boolean;      // True if no blocking errors
}

// YouTube Shorts requirements
const SHORTS_MAX_DURATION = 180; // 3 minutes (new limit as of 2024/2025)
const SHORTS_RECOMMENDED_DURATION = 60; // 60 seconds recommended
const SHORTS_TARGET_RATIO = 9 / 16; // 9:16 vertical
const RATIO_TOLERANCE = 0.05; // 5% tolerance for aspect ratio

/**
 * Validate if video meets YouTube Shorts requirements
 */
export function validateShorts(metadata: VideoMetadata): ShortsValidationResult {
  const issues: ValidationIssue[] = [];

  // Duration validation
  if (metadata.duration > SHORTS_MAX_DURATION) {
    issues.push({
      type: 'error',
      message: `Video is too long (${formatDuration(metadata.duration)}). YouTube Shorts maximum is ${SHORTS_MAX_DURATION / 60} minutes.`,
    });
  } else if (metadata.duration > SHORTS_RECOMMENDED_DURATION) {
    issues.push({
      type: 'warning',
      message: `Video is ${formatDuration(metadata.duration)} long. Shorts under ${SHORTS_RECOMMENDED_DURATION}s perform better, but up to ${SHORTS_MAX_DURATION / 60} minutes is allowed.`,
    });
  }

  // Aspect ratio validation
  const is9x16 = Math.abs(metadata.aspectRatio - SHORTS_TARGET_RATIO) < RATIO_TOLERANCE;

  if (!is9x16) {
    if (!metadata.isVertical) {
      // Landscape video - major error
      issues.push({
        type: 'error',
        message: `Video is landscape (${formatAspectRatio(metadata.aspectRatio)}). YouTube Shorts require vertical 9:16 format.`,
      });
    } else {
      // Vertical but not quite 9:16
      issues.push({
        type: 'warning',
        message: `Video aspect ratio is ${formatAspectRatio(metadata.aspectRatio)} (${formatDimensions(metadata.width, metadata.height)}). YouTube Shorts work best with 9:16.`,
      });
    }
  }

  // Determine validity
  const hasErrors = issues.some(issue => issue.type === 'error');
  const valid = !hasErrors;
  const canProceed = !hasErrors;

  // Add success message if valid
  if (valid && issues.length === 0) {
    issues.push({
      type: 'info',
      message: `Video meets YouTube Shorts requirements (${formatDuration(metadata.duration)}, ${formatAspectRatio(metadata.aspectRatio)}).`,
    });
  }

  return {
    valid,
    issues,
    canProceed,
  };
}

/**
 * Check if video should automatically be suggested as a Short
 */
export function shouldSuggestAsShort(metadata: VideoMetadata): boolean {
  // Suggest if:
  // - Video is vertical (9:16 or close to it)
  // - Duration is under 60 seconds
  return metadata.is9x16 && metadata.duration <= SHORTS_RECOMMENDED_DURATION;
}

/**
 * Get human-readable Shorts requirements
 */
export function getShortsRequirements(): string {
  return `YouTube Shorts Requirements:
• Format: Vertical 9:16 aspect ratio
• Duration: Up to ${SHORTS_MAX_DURATION / 60} minutes (${SHORTS_RECOMMENDED_DURATION}s recommended)
• Best for: Mobile-first, vertical videos under 1 minute`;
}
