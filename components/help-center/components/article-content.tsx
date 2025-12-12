'use client'

interface ArticleContentProps {
  content: string
}

/**
 * Sanitize a URL to prevent XSS attacks
 * Only allows http, https, mailto, and tel protocols
 */
function sanitizeUrl(url: string): string {
  // Trim and lowercase for comparison
  const trimmedUrl = url.trim()
  const lowerUrl = trimmedUrl.toLowerCase()

  // Allow only safe protocols
  if (
    lowerUrl.startsWith('http://') ||
    lowerUrl.startsWith('https://') ||
    lowerUrl.startsWith('mailto:') ||
    lowerUrl.startsWith('tel:') ||
    lowerUrl.startsWith('/') // Relative URLs
  ) {
    return trimmedUrl
  }

  // Block javascript:, data:, vbscript:, and other potentially dangerous protocols
  console.warn('Blocked potentially unsafe URL in markdown:', url)
  return '#'
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function ArticleContent({ content }: ArticleContentProps) {
  // Simple markdown to HTML conversion with XSS protection
  const renderMarkdown = (md: string) => {
    let html = md
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-900 mt-6 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h2>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code (escape HTML inside code blocks)
      .replace(/`([^`]+)`/g, (_, code) =>
        `<code class="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">${escapeHtml(code)}</code>`
      )
      // Links (sanitize URLs to prevent javascript: XSS)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) =>
        `<a href="${sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer" class="text-purple-600 hover:underline">${escapeHtml(text)}</a>`
      )
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-600">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-gray-600 list-decimal">$1</li>')
      // Tables (simple)
      .replace(/\| (.+) \|/g, (match) => {
        const cells = match.split('|').filter(Boolean).map(cell => cell.trim())
        return `<tr>${cells.map(cell => `<td class="py-2 px-3 border-b border-gray-200">${escapeHtml(cell)}</td>`).join('')}</tr>`
      })
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')
      // Paragraphs (lines that don't start with special chars)
      .replace(/^(?![<#\-\d|])(.+)$/gm, '<p class="text-gray-600 mb-3">$1</p>')

    // Wrap consecutive li elements in ul
    html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => {
      const isOrdered = match.includes('list-decimal')
      const tag = isOrdered ? 'ol' : 'ul'
      return `<${tag} class="mb-4 space-y-1 ${isOrdered ? 'list-decimal' : 'list-disc'} list-inside">${match}</${tag}>`
    })

    // Wrap table rows in table
    html = html.replace(/(<tr>.*?<\/tr>\n?)+/g, (match) => {
      return `<table class="w-full text-sm mb-4 border-collapse">${match}</table>`
    })

    return html
  }

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  )
}
