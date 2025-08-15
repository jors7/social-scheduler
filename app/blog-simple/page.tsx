import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SimpleBlogPage() {
  const supabase = createClient()
  
  // Simple query without joins
  const { data: posts, error: postsError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .limit(5)
  
  // Separate query for authors
  const { data: authors, error: authorsError } = await supabase
    .from('blog_authors')
    .select('*')
    .limit(5)
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Simple Blog Page (No Layout)</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Posts:</h2>
        {postsError ? (
          <div className="bg-red-50 p-4 rounded">
            <p className="font-bold">Posts Error:</p>
            <pre>{JSON.stringify(postsError, null, 2)}</pre>
          </div>
        ) : (
          <div className="bg-green-50 p-4 rounded">
            <p className="font-bold">Found {posts?.length || 0} posts</p>
            {posts?.map(post => (
              <div key={post.id} className="mt-2 p-2 bg-white rounded">
                <p className="font-semibold">{post.title}</p>
                <p className="text-sm text-gray-600">Status: {post.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-4">Authors:</h2>
        {authorsError ? (
          <div className="bg-red-50 p-4 rounded">
            <p className="font-bold">Authors Error:</p>
            <pre>{JSON.stringify(authorsError, null, 2)}</pre>
          </div>
        ) : (
          <div className="bg-green-50 p-4 rounded">
            <p className="font-bold">Found {authors?.length || 0} authors</p>
            {authors?.map(author => (
              <div key={author.id} className="mt-2 p-2 bg-white rounded">
                <p className="font-semibold">{author.display_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}