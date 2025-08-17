import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Check if R2 credentials are configured
    const r2AccountId = process.env.R2_ACCOUNT_ID
    const r2AccessKey = process.env.R2_ACCESS_KEY_ID
    const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY
    const r2BucketName = process.env.R2_BUCKET_NAME
    const r2PublicUrl = process.env.R2_PUBLIC_URL
    
    if (r2AccountId && r2AccessKey && r2SecretKey && r2BucketName && r2PublicUrl) {
      // Initialize R2 client (S3-compatible)
      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2SecretKey,
        },
      })

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `blog-images/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to R2
      const uploadCommand = new PutObjectCommand({
        Bucket: r2BucketName,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        // Add cache control for better performance
        CacheControl: 'public, max-age=31536000',
      })

      await r2Client.send(uploadCommand)

      // Construct the public URL
      const imageUrl = `${r2PublicUrl}/${fileName}`
      
      // Store reference in database
      await supabase
        .from('blog_media')
        .insert([{
          url: imageUrl,
          cloudflare_id: fileName, // Store the R2 key for potential deletion
          type: 'image',
          size: file.size,
          uploaded_by: user.id
        }])
      
      return NextResponse.json({ 
        url: imageUrl,
        success: true
      })
    } else {
      // Fallback to Supabase Storage if Cloudflare not configured
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `blog-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      return NextResponse.json({ url: publicUrl })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}