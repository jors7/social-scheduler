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

    // Parse JSON body
    const body = await request.json()
    const { filename, contentType, size } = body

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing filename or contentType' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and videos are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 500MB for videos, 50MB for images)
    const isVideo = contentType.startsWith('video/')
    const maxSize = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024
    if (size && size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${isVideo ? '500MB' : '50MB'}.` },
        { status: 400 }
      )
    }

    // Generate unique key for R2
    const key = r2Storage.generateKey(user.id, filename)

    // Get presigned upload URL (valid for 1 hour)
    const uploadUrl = await r2Storage.getPresignedUploadUrl(key, contentType, 3600)

    // Get the public URL for after upload completes
    const publicUrl = r2Storage.getPublicUrl(key)

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      contentType
    })
  } catch (error) {
    console.error('Post media presigned URL error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
