'use client'

import { useEffect, useMemo } from 'react'

interface BlogPostContentProps {
  content: string
}

export function BlogPostContent({ content }: BlogPostContentProps) {
  // Add IDs to headings for table of contents navigation
  const processedContent = useMemo(() => {
    return content.replace(/<h([2-3])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, text) => {
      // Generate ID from heading text
      const id = text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-')
      // Check if an ID already exists in the attributes
      if (attrs.includes('id=')) {
        return match
      }
      // Add the ID to the heading
      return `<h${level}${attrs} id="${id}">${text}</h${level}>`
    })
  }, [content])

  useEffect(() => {
    // Add syntax highlighting or other content enhancements here if needed
  }, [content])

  return (
    <article className="prose prose-lg max-w-none">
      <div 
        className="
          text-gray-700 leading-relaxed
          prose-headings:text-gray-900 prose-headings:font-bold
          prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
          prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
          prose-p:mb-6
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900
          prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6
          prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6
          prose-li:mb-2
          prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:my-8
          prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
          prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:my-8
          prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8
        "
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </article>
  )
}