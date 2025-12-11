import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

// Cache the sitemap for 1 hour in production
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.socialcal.app'
  const currentDate = new Date()
  
  try {
    // Initialize Supabase client
    const supabase = await createClient()
    
    // Core static pages with their priorities and update frequencies
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: currentDate,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/pricing`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.95,
      },
      {
        url: `${baseUrl}/login`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/signup`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.85,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/support`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: currentDate,
        changeFrequency: 'yearly',
        priority: 0.3,
      },
      {
        url: `${baseUrl}/privacy`,
        lastModified: currentDate,
        changeFrequency: 'yearly',
        priority: 0.3,
      },
    ]
    
    // Fetch dynamic pages from SEO settings table
    // This will include any custom pages you've added SEO for
    const { data: seoPages } = await supabase
      .from('seo_settings')
      .select('page_path, updated_at')
      .not('page_path', 'in', '("/","/pricing","/login","/signup","/about","/blog","/support","/contact","/terms","/privacy")')
      .order('page_path')
    
    const dynamicPages: MetadataRoute.Sitemap = seoPages?.map(page => ({
      url: `${baseUrl}${page.page_path}`,
      lastModified: page.updated_at ? new Date(page.updated_at) : currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })) || []
    
    // Check if blog_posts table exists and fetch published posts
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(100) // Limit to most recent 100 posts
    
    const blogPages: MetadataRoute.Sitemap = blogPosts?.map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at || post.published_at),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })) || []
    
    // Combine all pages
    const allPages = [
      ...staticPages,
      ...dynamicPages,
      ...blogPages,
    ]
    
    // Remove duplicates based on URL (in case of overlaps)
    const uniquePages = allPages.filter((page, index, self) =>
      index === self.findIndex(p => p.url === page.url)
    )
    
    // Sort by priority (highest first) for better crawling
    uniquePages.sort((a, b) => (b.priority || 0) - (a.priority || 0))
    
    return uniquePages
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error)
    
    // Fallback to basic static sitemap if database is unavailable
    return [
      {
        url: baseUrl,
        lastModified: currentDate,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/pricing`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.7,
      },
    ]
  }
}