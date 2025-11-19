import {
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './client'

export interface UploadResult {
  key: string
  url: string
  size: number
}

export class R2Storage {
  private client: ReturnType<typeof createR2Client> = null
  
  private getClient() {
    if (!this.client) {
      this.client = createR2Client()
    }
    if (!this.client) {
      throw new Error('R2 storage is not configured. Please set up Cloudflare R2 credentials.')
    }
    return this.client
  }

  /**
   * Upload a file to R2 storage
   */
  async upload(file: File | Buffer, key: string, contentType?: string): Promise<UploadResult> {
    try {
      // Convert File to Buffer if needed
      let buffer: Buffer
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
        contentType = contentType || file.type
      } else {
        buffer = file
      }

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
        // Add cache control for better performance
        CacheControl: 'public, max-age=31536000',
      })

      await this.getClient().send(command)

      // Generate public URL
      const url = this.getPublicUrl(key)

      return {
        key,
        url,
        size: buffer.length,
      }
    } catch (error) {
      console.error('R2 upload error:', error)
      throw new Error(`Failed to upload file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a file from R2 storage
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })

      await this.getClient().send(command)
    } catch (error) {
      console.error('R2 delete error:', error)
      throw new Error(`Failed to delete file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete multiple files from R2 storage
   */
  async deleteMany(keys: string[]): Promise<void> {
    try {
      // R2 doesn't support batch delete in the same way as S3
      // So we need to delete them one by one (or implement batch delete with DeleteObjects)
      await Promise.all(keys.map(key => this.delete(key)))
    } catch (error) {
      console.error('R2 batch delete error:', error)
      throw new Error(`Failed to delete files from R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if a file exists in R2
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })

      await this.getClient().send(command)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get a signed URL for temporary access (useful for private buckets)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })

      return await getSignedUrl(this.getClient(), command, { expiresIn })
    } catch (error) {
      console.error('R2 signed URL error:', error)
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a presigned URL for uploading a file directly to R2
   */
  async getPresignedUploadUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      })

      return await getSignedUrl(this.getClient(), command, { expiresIn })
    } catch (error) {
      console.error('R2 presigned upload URL error:', error)
      throw new Error(`Failed to generate presigned upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get the public URL for a file (assumes public bucket or CDN)
   */
  getPublicUrl(key: string): string {
    if (R2_PUBLIC_URL) {
      // Use custom domain or CDN URL
      return `${R2_PUBLIC_URL}/${key}`
    }
    // Fallback to R2 subdomain URL (requires public bucket)
    const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID
    return `https://${accountId}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`
  }

  /**
   * Generate a unique key for a file
   */
  generateKey(userId: string, filename: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const ext = filename.split('.').pop() || 'bin'
    return `${userId}/${timestamp}_${random}.${ext}`
  }
}

// Export singleton instance (lazy-loaded)
let _r2Storage: R2Storage | null = null

export function getR2Storage(): R2Storage {
  if (!_r2Storage) {
    _r2Storage = new R2Storage()
  }
  return _r2Storage
}

// For backward compatibility
export const r2Storage = {
  upload: (...args: Parameters<R2Storage['upload']>) => getR2Storage().upload(...args),
  delete: (...args: Parameters<R2Storage['delete']>) => getR2Storage().delete(...args),
  deleteMany: (...args: Parameters<R2Storage['deleteMany']>) => getR2Storage().deleteMany(...args),
  exists: (...args: Parameters<R2Storage['exists']>) => getR2Storage().exists(...args),
  getSignedUrl: (...args: Parameters<R2Storage['getSignedUrl']>) => getR2Storage().getSignedUrl(...args),
  getPresignedUploadUrl: (...args: Parameters<R2Storage['getPresignedUploadUrl']>) => getR2Storage().getPresignedUploadUrl(...args),
  getPublicUrl: (...args: Parameters<R2Storage['getPublicUrl']>) => getR2Storage().getPublicUrl(...args),
  generateKey: (...args: Parameters<R2Storage['generateKey']>) => getR2Storage().generateKey(...args),
}