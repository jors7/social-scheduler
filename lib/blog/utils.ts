import { createClient } from '@/lib/supabase/client'

// Check if SEO columns exist in the database
let seoColumnsExist: boolean | null = null

export async function checkSeoColumnsExist() {
  if (seoColumnsExist !== null) return seoColumnsExist
  
  try {
    const supabase = createClient()
    // Try to query with SEO fields
    const { data, error } = await supabase
      .from('blog_posts')
      .select('meta_title')
      .limit(1)
    
    seoColumnsExist = !error
    return seoColumnsExist
  } catch {
    seoColumnsExist = false
    return false
  }
}

export function prepareBlogPostData(
  data: any,
  includeSeo: boolean = true
) {
  const result: any = {}
  
  // Basic fields - handle empty values properly
  if (data.title !== undefined) result.title = data.title
  if (data.slug !== undefined) result.slug = data.slug
  if (data.excerpt !== undefined) result.excerpt = data.excerpt || null
  if (data.content !== undefined) result.content = data.content
  if (data.category !== undefined) result.category = data.category || null
  if (data.tags !== undefined) result.tags = Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : []
  if (data.featured !== undefined) result.featured = data.featured
  if (data.featured_image !== undefined) result.featured_image = data.featured_image || null
  if (data.status !== undefined) result.status = data.status
  if (data.reading_time !== undefined) result.reading_time = data.reading_time
  if (data.author_id !== undefined) result.author_id = data.author_id
  if (data.published_at !== undefined) result.published_at = data.published_at
  if (data.updated_at !== undefined) result.updated_at = data.updated_at
  
  // SEO fields - only include if they exist and are enabled
  if (includeSeo) {
    if (data.meta_title) result.meta_title = data.meta_title
    if (data.meta_description) result.meta_description = data.meta_description
    if (data.meta_keywords && Array.isArray(data.meta_keywords) && data.meta_keywords.length > 0) {
      result.meta_keywords = data.meta_keywords
    }
    if (data.og_title) result.og_title = data.og_title
    if (data.og_description) result.og_description = data.og_description
    if (data.og_image) result.og_image = data.og_image
    if (data.canonical_url) result.canonical_url = data.canonical_url
  }
  
  return result
}