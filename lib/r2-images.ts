// Auto-generated R2 URL mappings
// Generated on: 2025-08-18T10:34:59.253Z

export const R2_IMAGE_URLS: Record<string, string> = {
  "/Jan-Orsula.png": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/Jan-Orsula.png",
  "/Jan-Orsula.webp": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/Jan-Orsula.webp",
  "/SocialCal.png": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.png",
  "/SocialCal.webp": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp",
  "/hero-dashboard.png": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.png",
  "/hero-dashboard.webp": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp",
  "/apple-icon.png": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/apple-icon.png",
  "/apple-icon.webp": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/apple-icon.webp",
  "/icon.png": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/icon.png",
  "/icon.webp": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/icon.webp"
};

// Helper function to get R2 URL for a local path
export function getR2Url(localPath: string): string {
  return R2_IMAGE_URLS[localPath] || localPath;
}

// Common images
export const IMAGES = {
  logo: R2_IMAGE_URLS['/SocialCal.webp'] || '/SocialCal.webp',
  heroDashboard: R2_IMAGE_URLS['/hero-dashboard.webp'] || '/hero-dashboard.webp',
  janOrsula: R2_IMAGE_URLS['/Jan-Orsula.webp'] || '/Jan-Orsula.webp',
  icon: R2_IMAGE_URLS['/icon.webp'] || '/icon.webp',
  appleIcon: R2_IMAGE_URLS['/apple-icon.webp'] || '/apple-icon.webp',
};