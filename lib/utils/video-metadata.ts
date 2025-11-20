/**
 * Video Metadata Extraction Utilities
 * Extracts duration, dimensions, and aspect ratio from video files
 */

export interface VideoMetadata {
  duration: number;      // Duration in seconds
  width: number;         // Video width in pixels
  height: number;        // Video height in pixels
  aspectRatio: number;   // width / height
  size: number;          // File size in bytes
  isVertical: boolean;   // height > width
  is9x16: boolean;       // Specifically 9:16 aspect ratio (with tolerance)
}

/**
 * Extract metadata from a video file
 */
export async function extractVideoMetadata(videoFile: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      // Clean up
      window.URL.revokeObjectURL(video.src);

      const width = video.videoWidth;
      const height = video.videoHeight;
      const aspectRatio = width / height;
      const isVertical = height > width;

      // Check if 9:16 ratio (with 5% tolerance for encoding variations)
      const target9x16 = 9 / 16;
      const is9x16 = Math.abs(aspectRatio - target9x16) < 0.05;

      resolve({
        duration: video.duration,
        width,
        height,
        aspectRatio,
        size: videoFile.size,
        isVertical,
        is9x16,
      });
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Format duration as human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}

/**
 * Format aspect ratio as readable string
 */
export function formatAspectRatio(ratio: number): string {
  // Common ratios
  if (Math.abs(ratio - 16/9) < 0.05) return '16:9';
  if (Math.abs(ratio - 9/16) < 0.05) return '9:16';
  if (Math.abs(ratio - 4/3) < 0.05) return '4:3';
  if (Math.abs(ratio - 1) < 0.05) return '1:1';

  // Otherwise show decimal
  return ratio.toFixed(2);
}

/**
 * Format dimensions as readable string
 */
export function formatDimensions(width: number, height: number): string {
  return `${width}×${height}`;
}
