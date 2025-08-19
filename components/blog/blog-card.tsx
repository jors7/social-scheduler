'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  featured_image?: string
  published_at: string
  reading_time: number
  category: string
  tags?: string[]
  author?: {
    display_name: string
    avatar_url?: string
  }
}

interface BlogCardProps {
  post: BlogPost
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <article className="group cursor-pointer">
      <Link href={`/blog/${post.slug}`}>
        <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
          {/* Featured Image */}
          <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
            {post.featured_image ? (
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <span className="text-4xl font-bold text-blue-200">SC</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 flex-1 flex flex-col">
            {/* Title */}
            <h3 
              className="text-xl text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors"
              style={{ 
                fontFamily: 'Stolzl Medium, Stolzl, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: '500',
                lineHeight: '1.3',
                letterSpacing: '-0.01em'
              }}
            >
              {post.title}
            </h3>

            {/* Excerpt */}
            <p 
              className="text-gray-600 mb-4 line-clamp-3 flex-1"
              style={{ 
                fontFamily: 'var(--font-figtree), Figtree, -apple-system, BlinkMacSystemFont, sans-serif'
              }}
            >
              {post.excerpt}
            </p>

            {/* Meta Info */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                {post.author && (
                  <div className="flex items-center gap-2">
                    {post.author.avatar_url ? (
                      <Image
                        src={post.author.avatar_url}
                        alt={post.author.display_name}
                        width={24}
                        height={24}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {post.author.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-medium">{post.author.display_name}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{post.reading_time} min</span>
                </div>
              </div>
            </div>

            {/* Read More Link */}
            <div className="mt-4 pt-4 border-t">
              <span className="inline-flex items-center gap-2 text-blue-600 font-medium group-hover:gap-3 transition-all">
                Read More
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}