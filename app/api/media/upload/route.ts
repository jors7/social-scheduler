import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { r2Storage } from '@/lib/r2/storage'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check subscription for storage limits
    const { data: subscription } = await supabase
      .rpc('get_user_subscription', { user_uuid: user.id })
      .single() as { data: any }

    // Get current storage usage
    const { data: stats } = await supabase
      .rpc('get_media_stats', { user_uuid: user.id })
      .single() as { data: any }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and videos are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      )
    }

    // Check storage limits for Professional and Enterprise plans
    if (subscription && stats) {
      const planLimits: Record<string, number> = {
        professional: 250,
        enterprise: 500
      }
      
      const storageLimit = subscription?.plan_id ? planLimits[subscription.plan_id] : undefined
      if (storageLimit) {
        const currentUsageMB = stats.total_size_mb || 0
        const fileSizeMB = file.size / (1024 * 1024)
        const projectedUsage = currentUsageMB + fileSizeMB
        
        if (projectedUsage > storageLimit) {
          return NextResponse.json(
            { 
              error: `Storage limit exceeded. You have ${(storageLimit - currentUsageMB).toFixed(1)}MB remaining of your ${storageLimit}MB limit.` 
            },
            { status: 400 }
          )
        }
      }
    }

    // Generate unique key for R2
    const key = r2Storage.generateKey(user.id, file.name)

    // Upload to R2
    const uploadResult = await r2Storage.upload(file, key, file.type)

    // Get dimensions for images
    let dimensions: { width: number | null; height: number | null } = { 
      width: null, 
      height: null 
    }
    
    if (file.type.startsWith('image/')) {
      // For server-side, we'd need to use a library like sharp
      // For now, we'll leave dimensions null and update them client-side if needed
    }

    // Save metadata to database
    const { data: mediaEntry, error: dbError } = await supabase
      .from('media_library')
      .insert({
        user_id: user.id,
        filename: key, // Store R2 key as filename
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        url: uploadResult.url,
        width: dimensions.width,
        height: dimensions.height,
        tags: []
      })
      .select()
      .single()

    if (dbError) {
      // If database insert fails, try to delete the uploaded file
      await r2Storage.delete(key)
      throw dbError
    }

    return NextResponse.json({
      success: true,
      media: mediaEntry
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout for large uploads