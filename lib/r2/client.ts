import { S3Client } from '@aws-sdk/client-s3'

// Create S3-compatible client for Cloudflare R2
export function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('Missing Cloudflare R2 credentials - R2 storage will not be available')
    return null
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'social-scheduler-media'
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''