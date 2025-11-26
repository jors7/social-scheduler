/**
 * Error Sanitizer Utility
 * Sanitizes and truncates error messages for storage
 */

const MAX_ERROR_MESSAGE_LENGTH = 1000;
const MAX_SINGLE_PLATFORM_ERROR_LENGTH = 200;

/**
 * Sanitize an error message for storage
 * - Removes HTML tags
 * - Strips excessive whitespace
 * - Truncates to reasonable length
 * - Extracts meaningful error info from API responses
 */
export function sanitizeErrorMessage(
  message: string,
  maxLength: number = MAX_ERROR_MESSAGE_LENGTH
): string {
  if (!message) return 'Unknown error';

  let sanitized = message;

  // Remove HTML tags (in case API returned HTML error page)
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  sanitized = sanitized
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Try to extract JSON error message if present
  const jsonMatch = sanitized.match(/"(?:message|error|error_message|description)"\s*:\s*"([^"]+)"/i);
  if (jsonMatch) {
    sanitized = jsonMatch[1];
  }

  // Truncate with ellipsis if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...';
  }

  return sanitized;
}

/**
 * Sanitize a platform-specific error message
 * Used when combining multiple platform errors
 */
export function sanitizePlatformError(
  platform: string,
  error: string
): string {
  const sanitized = sanitizeErrorMessage(error, MAX_SINGLE_PLATFORM_ERROR_LENGTH);
  return `${platform}: ${sanitized}`;
}

/**
 * Combine multiple platform errors into a single message
 */
export function combineErrorMessages(
  errors: Array<{ platform: string; error: string }>
): string {
  if (errors.length === 0) return 'Unknown error';

  const sanitizedErrors = errors.map(e =>
    sanitizePlatformError(e.platform, e.error)
  );

  const combined = sanitizedErrors.join('; ');

  // Final truncation if combined is too long
  if (combined.length > MAX_ERROR_MESSAGE_LENGTH) {
    return combined.substring(0, MAX_ERROR_MESSAGE_LENGTH - 3) + '...';
  }

  return combined;
}

/**
 * Extract error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';

  if (typeof error === 'string') {
    return sanitizeErrorMessage(error);
  }

  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message);
  }

  // Handle API error response objects
  if (typeof error === 'object') {
    const errorObj = error as Record<string, any>;

    // Common error response formats
    const message =
      errorObj.message ||
      errorObj.error?.message ||
      errorObj.error_message ||
      errorObj.error?.error_message ||
      errorObj.error_description ||
      errorObj.error?.description ||
      errorObj.detail ||
      (typeof errorObj.error === 'string' ? errorObj.error : null);

    if (message) {
      return sanitizeErrorMessage(message);
    }

    // Last resort: stringify the object
    try {
      return sanitizeErrorMessage(JSON.stringify(error));
    } catch {
      return 'Error object could not be serialized';
    }
  }

  return 'Unknown error';
}
