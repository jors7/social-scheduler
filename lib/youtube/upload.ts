import { Readable } from 'stream';
import { youtube_v3 } from 'googleapis';

/**
 * YouTube video upload utilities
 */

export interface VideoUploadOptions {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'private' | 'public' | 'unlisted';
  notifySubscribers?: boolean;
}

export interface VideoMetadata extends VideoUploadOptions {
  mimeType: string;
  fileSize: number;
}

/**
 * Convert a web ReadableStream to Node.js Readable stream
 */
export function webStreamToNodeStream(webStream: ReadableStream): Readable {
  const reader = webStream.getReader();
  
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    }
  });
}

/**
 * Convert a Blob or File to a Node.js Readable stream
 */
export async function blobToStream(blob: Blob): Promise<Readable> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return Readable.from(buffer);
}

/**
 * Create video resource for YouTube API
 */
export function createVideoResource(metadata: VideoUploadOptions): youtube_v3.Schema$Video {
  return {
    snippet: {
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      categoryId: metadata.categoryId || '22', // Default: People & Blogs
    },
    status: {
      privacyStatus: metadata.privacyStatus || 'private',
      selfDeclaredMadeForKids: false,
      embeddable: true,
    },
  };
}

/**
 * Validate video file
 */
export function validateVideoFile(file: { type: string; size: number }): { 
  valid: boolean; 
  error?: string;
} {
  // Supported video formats
  const supportedFormats = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm',
    'video/3gpp',
    'video/x-matroska',
  ];

  // Check file type
  if (!supportedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported video format. Supported formats: MP4, MOV, AVI, WMV, FLV, WebM, 3GPP`,
    };
  }

  // Check file size (YouTube max is 128GB, but we'll limit to 5GB for practical reasons)
  const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Video file is too large. Maximum size is 5GB.',
    };
  }

  // Minimum size check (1KB)
  if (file.size < 1024) {
    return {
      valid: false,
      error: 'Video file is too small. Please select a valid video file.',
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate YouTube video URL from ID
 */
export function generateYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Parse YouTube API error
 */
export function parseYouTubeError(error: any): string {
  if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    const firstError = error.errors[0];
    
    // Common YouTube API errors
    switch (firstError.reason) {
      case 'quotaExceeded':
        return 'YouTube API quota exceeded. Please try again later.';
      case 'videoNotFound':
        return 'Video not found.';
      case 'forbidden':
        return 'You do not have permission to perform this action.';
      case 'invalidVideoId':
        return 'Invalid video ID.';
      case 'uploadLimitExceeded':
        return 'Upload limit exceeded. Please try again later.';
      case 'invalidRequest':
        return firstError.message || 'Invalid request to YouTube API.';
      default:
        return firstError.message || 'An error occurred with YouTube API.';
    }
  }

  if (error.message) {
    return error.message;
  }

  return 'An unknown error occurred while uploading to YouTube.';
}