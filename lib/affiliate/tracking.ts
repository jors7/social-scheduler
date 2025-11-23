// =====================================================
// AFFILIATE TRACKING UTILITIES
// =====================================================
// Client-side and server-side utilities for tracking affiliate referrals

import { cookies } from 'next/headers';
import crypto from 'crypto';

// =====================================================
// CONFIGURATION
// =====================================================

export const AFFILIATE_COOKIE_NAME = 'socialcal_referral';
export const AFFILIATE_COOKIE_DURATION_DAYS = parseInt(
  process.env.AFFILIATE_COOKIE_DURATION_DAYS || '30',
  10
);

// =====================================================
// COOKIE MANAGEMENT (Server-Side)
// =====================================================

/**
 * Get the affiliate referral code from cookies (server-side)
 */
export async function getAffiliateReferralFromCookie(): Promise<string | null> {
  const cookieStore = cookies();
  const referralCookie = cookieStore.get(AFFILIATE_COOKIE_NAME);
  return referralCookie?.value || null;
}

/**
 * Set the affiliate referral cookie (server-side)
 * Called by middleware when ?ref= parameter is detected
 */
export function setAffiliateReferralCookie(
  referralCode: string,
  response: Response
): void {
  const maxAge = AFFILIATE_COOKIE_DURATION_DAYS * 24 * 60 * 60; // Convert to seconds

  // Set cookie with secure options
  const cookieValue = `${AFFILIATE_COOKIE_NAME}=${referralCode}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`;

  // Add to response headers
  response.headers.append('Set-Cookie', cookieValue);
}

/**
 * Clear the affiliate referral cookie
 */
export function clearAffiliateReferralCookie(response: Response): void {
  const cookieValue = `${AFFILIATE_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  response.headers.append('Set-Cookie', cookieValue);
}

// =====================================================
// COOKIE MANAGEMENT (Client-Side)
// =====================================================

/**
 * Get the affiliate referral code from cookies (client-side)
 */
export function getAffiliateReferralFromBrowser(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === AFFILIATE_COOKIE_NAME) {
      return value;
    }
  }
  return null;
}

/**
 * Set the affiliate referral cookie (client-side)
 */
export function setAffiliateReferralInBrowser(referralCode: string): void {
  if (typeof document === 'undefined') return;

  const maxAge = AFFILIATE_COOKIE_DURATION_DAYS * 24 * 60 * 60;
  const expires = new Date();
  expires.setTime(expires.getTime() + maxAge * 1000);

  document.cookie = `${AFFILIATE_COOKIE_NAME}=${referralCode}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
}

/**
 * Clear the affiliate referral cookie (client-side)
 */
export function clearAffiliateReferralInBrowser(): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${AFFILIATE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// =====================================================
// URL PARAMETER EXTRACTION
// =====================================================

/**
 * Extract referral code from URL parameter
 * Supports both ?ref=CODE and ?referral=CODE
 */
export function extractReferralCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.searchParams.get('ref') ||
      urlObj.searchParams.get('referral') ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Build tracking URL with referral code
 */
export function buildTrackingUrl(
  baseUrl: string,
  referralCode: string,
  utmParams?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  }
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('ref', referralCode);

  if (utmParams) {
    if (utmParams.utm_source) url.searchParams.set('utm_source', utmParams.utm_source);
    if (utmParams.utm_medium) url.searchParams.set('utm_medium', utmParams.utm_medium);
    if (utmParams.utm_campaign) url.searchParams.set('utm_campaign', utmParams.utm_campaign);
    if (utmParams.utm_term) url.searchParams.set('utm_term', utmParams.utm_term);
    if (utmParams.utm_content) url.searchParams.set('utm_content', utmParams.utm_content);
  }

  return url.toString();
}

// =====================================================
// IP ADDRESS ANONYMIZATION
// =====================================================

/**
 * Hash an IP address for GDPR-compliant tracking
 * Uses SHA-256 with a daily salt to prevent reverse lookups
 */
export function anonymizeIpAddress(ipAddress: string): string {
  // Use date as salt to prevent linking across days
  const dateSalt = new Date().toISOString().split('T')[0];
  const hash = crypto
    .createHash('sha256')
    .update(ipAddress + dateSalt)
    .digest('hex');

  // Return first 16 characters for storage efficiency
  return hash.substring(0, 16);
}

/**
 * Extract IP address from request headers
 * Handles proxies and load balancers
 */
export function getIpAddressFromRequest(request: Request): string {
  const headers = request.headers;

  // Check common proxy headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to placeholder (shouldn't happen in production)
  return '0.0.0.0';
}

// =====================================================
// USER AGENT PARSING
// =====================================================

/**
 * Get user agent from request
 */
export function getUserAgentFromRequest(request: Request): string {
  return request.headers.get('user-agent') || 'Unknown';
}

/**
 * Extract referrer URL from request
 */
export function getReferrerFromRequest(request: Request): string | null {
  return request.headers.get('referer') || request.headers.get('referrer') || null;
}

// =====================================================
// CLICK TRACKING DATA
// =====================================================

export interface TrackingData {
  referralCode: string;
  ipHash: string;
  userAgent: string;
  referrerUrl: string | null;
  currentUrl: string;
}

/**
 * Collect all tracking data from a request
 */
export function collectTrackingData(
  request: Request,
  referralCode: string
): TrackingData {
  return {
    referralCode,
    ipHash: anonymizeIpAddress(getIpAddressFromRequest(request)),
    userAgent: getUserAgentFromRequest(request),
    referrerUrl: getReferrerFromRequest(request),
    currentUrl: request.url,
  };
}

// =====================================================
// CONVERSION ATTRIBUTION
// =====================================================

/**
 * Determine which affiliate should get credit for a conversion
 * Uses "last-click" attribution within the cookie window
 */
export async function getAttributedAffiliate(): Promise<string | null> {
  const referralCode = await getAffiliateReferralFromCookie();
  return referralCode;
}

/**
 * Check if a referral code is valid (exists in database)
 * This should be called with database access
 */
export async function validateReferralCode(
  referralCode: string,
  supabase: any
): Promise<boolean> {
  const { data, error } = await supabase
    .from('affiliates')
    .select('id')
    .eq('referral_code', referralCode)
    .eq('status', 'active')
    .single();

  return !error && !!data;
}

/**
 * Get affiliate ID from referral code
 */
export async function getAffiliateIdFromCode(
  referralCode: string,
  supabase: any
): Promise<string | null> {
  const { data, error } = await supabase
    .from('affiliates')
    .select('id')
    .eq('referral_code', referralCode)
    .eq('status', 'active')
    .single();

  if (error || !data) return null;
  return data.id;
}

// =====================================================
// TRACKING PIXEL (Optional)
// =====================================================

/**
 * Generate a 1x1 tracking pixel response
 * Can be used for email or external tracking
 */
export function generateTrackingPixel(): Response {
  // 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  return new Response(pixel, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

// =====================================================
// QR CODE GENERATION
// =====================================================

/**
 * Generate QR code URL for a tracking link
 * Uses a free QR code API service
 */
export function generateQRCodeUrl(trackingUrl: string, size: number = 300): string {
  const encodedUrl = encodeURIComponent(trackingUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}`;
}

// =====================================================
// EXPORTS
// =====================================================

export const affiliateTracking = {
  // Cookie management
  getAffiliateReferralFromCookie,
  setAffiliateReferralCookie,
  clearAffiliateReferralCookie,
  getAffiliateReferralFromBrowser,
  setAffiliateReferralInBrowser,
  clearAffiliateReferralInBrowser,

  // URL handling
  extractReferralCodeFromUrl,
  buildTrackingUrl,

  // Privacy
  anonymizeIpAddress,
  getIpAddressFromRequest,

  // Request data
  getUserAgentFromRequest,
  getReferrerFromRequest,
  collectTrackingData,

  // Attribution
  getAttributedAffiliate,
  validateReferralCode,
  getAffiliateIdFromCode,

  // Utilities
  generateTrackingPixel,
  generateQRCodeUrl,
};

export default affiliateTracking;
