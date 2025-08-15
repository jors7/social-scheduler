import { createClient } from '@/lib/supabase/server'

export default async function TestBlogPage() {
  try {
    const supabase = createClient()
    
    // Simple test query
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, status')
      .eq('status', 'published')
      .limit(5)
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Blog Test Page</h1>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify({ data, error }, null, 2)}
        </pre>
      </div>
    )
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <pre className="bg-red-100 p-4 rounded">
          {JSON.stringify({
            message: error instanceof Error ? error.message : 'Unknown error',
            error
          }, null, 2)}
        </pre>
      </div>
    )
  }
}