'use client'

import { format } from 'date-fns'

interface BlogPostHeaderProps {
  post: {
    title: string
    excerpt: string
    featured_image?: string
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
    <header className="py-12 border-b">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Column - Text Content */}
        <div className="space-y-6">
          {/* Title */}
          <h1 
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight"
            style={{ 
              fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
              letterSpacing: '-0.02em'
            }}
          >
            {post.title}
          </h1>

          {/* Excerpt/Subheadline */}
          <p 
            className="text-lg md:text-xl text-gray-600 leading-relaxed"
            style={{ 
              fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
              fontStyle: 'italic'
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
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </header>
  )
}