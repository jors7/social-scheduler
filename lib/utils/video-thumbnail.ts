/**
 * Extracts the first frame of a video file as a thumbnail image
 * @param videoFile - The video file to extract thumbnail from
 * @returns Promise<File> - The thumbnail as a JPEG file, or null if extraction fails
 */
export async function extractVideoThumbnail(
  videoFile: File
): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      // Create video element
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      // Create object URL for the video
      const videoURL = URL.createObjectURL(videoFile);

      video.onloadedmetadata = () => {
        // Seek to 1 second or start of video
        video.currentTime = Math.min(1, video.duration / 10);
      };

      video.onseeked = () => {
        try {
          // Create canvas to capture frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Failed to get canvas context');
            URL.revokeObjectURL(videoURL);
            resolve(null);
            return;
          }

          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              // Clean up
              URL.revokeObjectURL(videoURL);

              if (!blob) {
                console.error('Failed to create thumbnail blob');
                resolve(null);
                return;
              }

              // Create File from blob
              const thumbnailFile = new File(
                [blob],
                `${videoFile.name.replace(/\.[^/.]+$/, '')}_thumb.jpg`,
                { type: 'image/jpeg' }
              );

              resolve(thumbnailFile);
            },
            'image/jpeg',
            0.8 // Quality
          );
        } catch (error) {
          console.error('Error capturing video frame:', error);
          URL.revokeObjectURL(videoURL);
          resolve(null);
        }
      };

      video.onerror = () => {
        console.error('Error loading video for thumbnail extraction');
        URL.revokeObjectURL(videoURL);
        resolve(null);
      };

      // Set video source
      video.src = videoURL;
    } catch (error) {
      console.error('Error extracting video thumbnail:', error);
      resolve(null);
    }
  });
}

/**
 * Checks if a file is a video file
 */
export function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith('video/') ||
    /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name)
  );
}

/**
 * Checks if a URL points to a video file
 */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url);
}
