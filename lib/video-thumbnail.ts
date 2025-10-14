/**
 * Extract a thumbnail image from a video file
 * Uses Canvas API to capture the first frame
 */
export async function extractVideoThumbnail(
  videoFile: File,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    seekTime?: number; // Time in seconds to capture (default: 0 for first frame)
  } = {}
): Promise<Blob | null> {
  const {
    width = 1280,
    height = 720,
    quality = 0.92,
    seekTime = 0.1 // Slightly after start to avoid black frames
  } = options;

  return new Promise((resolve) => {
    try {
      // Create video element
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      // Create canvas for thumbnail
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('Could not get canvas context');
        resolve(null);
        return;
      }

      // Handle video loaded
      video.addEventListener('loadedmetadata', () => {
        // Set canvas dimensions based on video aspect ratio
        const aspectRatio = video.videoWidth / video.videoHeight;

        if (aspectRatio > 1) {
          // Landscape video
          canvas.width = width;
          canvas.height = width / aspectRatio;
        } else {
          // Portrait video (like Shorts)
          canvas.height = height;
          canvas.width = height * aspectRatio;
        }

        // Seek to the desired time
        video.currentTime = Math.min(seekTime, video.duration);
      });

      // Handle seeked event (when video is at the right frame)
      video.addEventListener('seeked', () => {
        try {
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              // Cleanup
              URL.revokeObjectURL(video.src);
              resolve(blob);
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          console.error('Error drawing video frame:', error);
          URL.revokeObjectURL(video.src);
          resolve(null);
        }
      });

      // Handle errors
      video.addEventListener('error', (e) => {
        console.error('Video loading error:', e);
        URL.revokeObjectURL(video.src);
        resolve(null);
      });

      // Load the video file
      video.src = URL.createObjectURL(videoFile);
      video.load();

      // Safety timeout (10 seconds)
      setTimeout(() => {
        console.error('Video thumbnail extraction timeout');
        URL.revokeObjectURL(video.src);
        resolve(null);
      }, 10000);

    } catch (error) {
      console.error('Error in extractVideoThumbnail:', error);
      resolve(null);
    }
  });
}

/**
 * Convert a Blob to a File
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}
