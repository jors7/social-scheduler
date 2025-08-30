'use client'

import Image from 'next/image'
import { format } from 'date-fns'

interface BlogPostHeaderProps {
  post: {
    title: string
    excerpt: string
    featured_image?: string
    featured_image_blur?: string
    published_at: string
    reading_time: number
    view_count: number
    category: string
    tags?: string[]
    author?: {
      display_name: string
      avatar_url?: string
    }
  }
}

export function BlogPostHeader({ post }: BlogPostHeaderProps) {
  return (
    <header className="py-8 border-b">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm mb-4">
        <a href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
          Home
        </a>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <a href="/blog" className="text-gray-500 hover:text-gray-700 transition-colors">
          Blog
        </a>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium capitalize">
          {post.category.replace(/-/g, ' ')}
        </span>
      </nav>
      
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Column - Text Content */}
        <div className="space-y-6">
          {/* Title */}
          <h1 
            className="text-3xl md:text-4xl lg:text-5xl text-gray-900"
            style={{ 
              fontFamily: 'Stolzl Medium, Stolzl, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: '500',
              lineHeight: '1.1',
              letterSpacing: '-0.02em'
            }}
          >
            {post.title}
          </h1>

          {/* Excerpt/Subheadline */}
          <p 
            className="text-lg md:text-xl text-gray-600 leading-relaxed"
            style={{ 
              fontFamily: 'var(--font-figtree), Figtree, -apple-system, BlinkMacSystemFont, sans-serif'
            }}
          >
            {post.excerpt}
          </p>

          {/* Meta Information */}
          <div className="flex items-center gap-2 text-base text-gray-600">
            {post.author && (
              <>
                <span className="font-medium text-gray-900">{post.author.display_name}</span>
                <span>·</span>
              </>
            )}
            <span>{post.reading_time} min read</span>
            <span>·</span>
            <span>{format(new Date(post.published_at), 'MMM dd, yyyy')}</span>
          </div>
        </div>

        {/* Right Column - Featured Image */}
        {post.featured_image && (
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl shadow-xl">
            <Image
              src={post.featured_image}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              placeholder={post.featured_image_blur ? "blur" : "empty"}
              blurDataURL={post.featured_image_blur}
              priority
            />
          </div>
        )}
      </div>
    </header>
  )
}