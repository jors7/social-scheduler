'use client'

import { useMemo } from 'react'
import styles from './blog-post-content.module.css'

interface Heading {
  id: string
  text: string
  level: number
}

interface BlogPostContentProps {
  content: string
  headings?: Heading[]
}

export function BlogPostContent({ content, headings = [] }: BlogPostContentProps) {
  // Function to insert mobile TOC after first paragraph
  const insertMobileTOCAfterFirstParagraph = (htmlContent: string, headingsList: Heading[]) => {
    const h2Headings = headingsList.filter(h => h.level === 2)
    
    if (h2Headings.length === 0) {
      return htmlContent
    }
    
    const firstParagraphEnd = htmlContent.indexOf('</p>')
    
    if (firstParagraphEnd === -1) {
      return htmlContent
    }
    
    const mobileTocHtml = `<div class="lg:hidden my-8 px-3 pt-2 pb-3 bg-gray-50 border border-gray-200 rounded-lg"><h3 class="text-[15px] font-semibold text-gray-900 mb-1.5">Jump to a section:</h3><ul class="leading-tight not-italic" style="font-style: normal;">${h2Headings.map((heading) => `<li><a href="#${heading.id}" class="block text-[15px] text-green-700 hover:text-green-900 transition-colors duration-200 not-italic" style="font-style: normal;" onclick="event.preventDefault(); const element = document.getElementById('${heading.id}'); if (element) { const yOffset = -70; const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset; window.scrollTo({ top: y, behavior: 'smooth' }); }">${heading.text}</a></li>`).join('')}</ul></div>`
    
    const beforeFirstParagraph = htmlContent.substring(0, firstParagraphEnd + 4)
    const afterFirstParagraph = htmlContent.substring(firstParagraphEnd + 4)
    
    return beforeFirstParagraph + mobileTocHtml + afterFirstParagraph
  }

  // Add IDs to headings for table of contents navigation
  const processedContent = useMemo(() => {
    let contentWithIds = content.replace(/<h([2-3])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, text) => {
      // Generate ID from heading text
      const id = text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      // Check if an ID already exists in the attributes
      if (attrs.includes('id=')) {
        return match
      }
      // Add the ID to the heading
      return `<h${level}${attrs} id="${id}">${text}</h${level}>`
    })
    
    // Insert mobile TOC after first paragraph
    if (headings.length > 0) {
      contentWithIds = insertMobileTOCAfterFirstParagraph(contentWithIds, headings)
    }
    
    return contentWithIds
  }, [content, headings])

  return (
    <article className="max-w-none">
      <div 
        className={styles.blogContent}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </article>
  )
}