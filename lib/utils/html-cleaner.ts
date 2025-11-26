/**
 * Shared HTML content cleaning utility
 * Used by both PostingService and scheduled post processing
 */

/**
 * Cleans HTML content for social media posting
 * - Decodes HTML entities
 * - Converts HTML structure to appropriate line breaks
 * - Removes remaining HTML tags
 * - Normalizes whitespace
 */
export function cleanHtmlContent(content: string): string {
  // Handle null/undefined content
  if (!content || typeof content !== 'string') {
    return '';
  }

  let cleaned = content;

  // First, decode any HTML entities that might have been double-encoded
  // This handles cases like &lt;p&gt;text&lt;/p&gt; -> <p>text</p>
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Now convert HTML tags to line breaks
  cleaned = cleaned
    .replace(/<\/p>/gi, '\n\n') // End of paragraph gets double line break
    .replace(/<br\s*\/?>/gi, '\n') // Line breaks get single line break
    .replace(/<\/div>/gi, '\n') // Divs often act as line breaks
    .replace(/<\/li>/gi, '\n'); // List items get line breaks

  // Replace remaining HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Remove remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Clean up excessive line breaks (more than 2 in a row)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Replace multiple spaces with single space (but preserve line breaks)
  cleaned = cleaned.replace(/[^\S\n]+/g, ' ');

  // Trim whitespace from start and end, and from each line
  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();

  return cleaned;
}
