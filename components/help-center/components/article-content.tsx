'use client'

interface ArticleContentProps {
  content: string
}

export function ArticleContent({ content }: ArticleContentProps) {
  // Simple markdown to HTML conversion
  const renderMarkdown = (md: string) => {
    let html = md
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-900 mt-6 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h2>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-purple-600 hover:underline">$1</a>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-600">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-gray-600 list-decimal">$1</li>')
      // Tables (simple)
      .replace(/\| (.+) \|/g, (match) => {
        const cells = match.split('|').filter(Boolean).map(cell => cell.trim())
        return `<tr>${cells.map(cell => `<td class="py-2 px-3 border-b border-gray-200">${cell}</td>`).join('')}</tr>`
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
