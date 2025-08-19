'use client'

import { useEffect, useMemo } from 'react'
import styles from './blog-post-content.module.css'

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
    <article className="max-w-none">
      <div 
        className={styles.blogContent}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </article>
  )
}