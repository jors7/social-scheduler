import { BlogCard } from './blog-card'
import { BlogPagination } from './blog-pagination'

interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  featured_image: string
  published_at: string
  reading_time: number
  category: string
  tags: string[]
  author: {
    display_name: string
    avatar_url?: string
  }
}

interface BlogGridProps {
  posts: BlogPost[]
  currentPage: number
  totalPages: number
  searchParams: { category?: string; search?: string; page?: string }
}

export function BlogGrid({ posts, currentPage, totalPages, searchParams }: BlogGridProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="max-w-md mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">No posts found</h3>
          <p className="text-gray-600 mb-8">
            {searchParams.search 
              ? `No posts matching "${searchParams.search}"`
              : 'No posts available in this category yet.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Posts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <BlogPagination
          currentPage={currentPage}
          totalPages={totalPages}
          searchParams={searchParams}
        />
      )}
    </div>
  )
}