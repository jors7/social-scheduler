'use client'

import Image from 'next/image'
import { Twitter, Linkedin } from 'lucide-react'

interface BlogPostAuthorProps {
  author: {
    display_name: string
    bio?: string
    avatar_url?: string
    twitter_handle?: string
    linkedin_url?: string
  }
}

export function BlogPostAuthor({ author }: BlogPostAuthorProps) {
  return (
    <div className="mt-12 p-8 bg-gray-50 rounded-2xl">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">About the Author</h3>
      <div className="flex gap-4">
        {author.avatar_url ? (
          <Image
            src={author.avatar_url}
            alt={author.display_name}
            width={80}
            height={80}
            className="rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-medium text-gray-600">
              {author.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <h4 className="text-xl font-bold text-gray-900 mb-2">{author.display_name}</h4>
          {author.bio && (
            <p className="text-gray-600 mb-4">{author.bio}</p>
          )}
          
          {/* Social Links */}
          <div className="flex gap-3">
            {author.twitter_handle && (
              <a
                href={`https://twitter.com/${author.twitter_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-500 transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
            )}
            {author.linkedin_url && (
              <a
                href={author.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-600 transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}