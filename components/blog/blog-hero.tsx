'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, User, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface BlogHeroProps {
  post: {
    id: string
    slug: string
    title: string
    excerpt: string
    featured_image: string
    featured_image_blur?: string
    published_at: string
    reading_time: number
    category: string
    author: {
      display_name: string
      avatar_url?: string
    }
  }
}

export function BlogHero({ post }: BlogHeroProps) {
  return (
    <section className="relative bg-gradient-to-b from-gray-900 to-gray-800 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-6">
            <div className="inline-block">
              <span className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
                Featured Post
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <Link href={`/blog/${post.slug}`} className="hover:text-blue-400 transition-colors">
                {post.title}
              </Link>
            </h1>
            
            <p className="text-xl text-gray-300 leading-relaxed">
              {post.excerpt}
            </p>

            {/* Post Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {post.author.avatar_url && (
                <div className="flex items-center gap-2">
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.display_name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{post.author.display_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{post.reading_time} min read</span>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Read Article
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Featured Image */}
          {post.featured_image && (
            <div className="relative group">
              <Link href={`/blog/${post.slug}`}>
                <div className="relative overflow-hidden rounded-2xl shadow-2xl h-[400px]">
                  {post.featured_image.endsWith('.svg') ? (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Image
                      src={post.featured_image}
                      alt={post.title}
                      fill
                      sizes="(max-width: 1280px) 100vw, 1280px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      placeholder={post.featured_image_blur ? "blur" : "empty"}
                      blurDataURL={post.featured_image_blur}
                      priority
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}