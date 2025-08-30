'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface RelatedPost {
  id: string
  slug: string
  title: string
  excerpt: string
  featured_image?: string
  featured_image_blur?: string
  published_at: string
  reading_time: number
  author?: {
    display_name: string
    avatar_url?: string
  }
}

interface RelatedPostsProps {
  posts: RelatedPost[]
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  return (
    <section className="mt-16 pt-16 border-t">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Articles</h2>
      
      <div className="grid md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group"
          >
            <article className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                {post.featured_image ? (
                  <Image
                    src={post.featured_image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    placeholder={post.featured_image_blur ? "blur" : "empty"}
                    blurDataURL={post.featured_image_blur}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                    <span className="text-2xl font-bold text-blue-200">SC</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{post.reading_time} min read</span>
                  <span>{formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}