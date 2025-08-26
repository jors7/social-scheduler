# Cloudflare R2 Storage Setup Guide

This guide walks you through setting up Cloudflare R2 storage for the media library feature.

## Prerequisites

- A Cloudflare account
- Access to the Cloudflare dashboard

## Step 1: Create an R2 Bucket

1. Log in to your [Cloudflare dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the sidebar
3. Click **Create bucket**
4. Enter a bucket name (e.g., `social-scheduler-media`)
5. Choose your preferred location
6. Click **Create bucket**

## Step 2: Configure Public Access (Optional)

If you want your media files to be publicly accessible via a custom domain:

1. Go to your R2 bucket settings
2. Navigate to **Settings** > **Public Access**
3. Enable public access
4. Configure a custom domain (optional):
   - Click **Connect Domain**
   - Enter your subdomain (e.g., `cdn.yourdomain.com`)
   - Follow the DNS configuration instructions

## Step 3: Generate API Credentials

1. In the R2 dashboard, click **Manage R2 API tokens**
2. Click **Create API token**
3. Configure the token:
   - **Token name**: `social-scheduler-media-access`
   - **Permissions**: Select **Object Read & Write**
   - **Specify bucket**: Select your bucket (`social-scheduler-media`)
   - **TTL**: Leave as default or set as needed
4. Click **Create API Token**
5. **Important**: Save the following credentials:
   - Access Key ID
   - Secret Access Key
   - Account ID (visible in your Cloudflare dashboard URL)

## Step 4: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=social-scheduler-media

# Optional: If you configured a custom domain
R2_PUBLIC_URL=https://cdn.yourdomain.com
```

## Step 5: Configure CORS (if needed)

If you're accessing R2 directly from the browser, configure CORS:

1. Go to your R2 bucket settings
2. Navigate to **Settings** > **CORS Policy**
3. Add the following policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3001", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Step 6: Verify Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Media Library in your dashboard

3. Try uploading a test image

4. Verify that:
   - The image uploads successfully
   - The image URL points to R2 (or your custom domain)
   - Deletion removes the file from both R2 and the database

## Storage Limits by Plan

The media library enforces the following storage limits:

- **Free/Starter**: No media library access
- **Professional**: 250MB storage limit
- **Enterprise**: 500MB storage limit

## Troubleshooting

### Upload fails with "Missing Cloudflare R2 credentials"

Ensure all R2 environment variables are set correctly in `.env.local`:
- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### Images not displaying

1. Check if public access is enabled on your bucket
2. Verify CORS settings if accessing from the browser
3. Check that the R2_PUBLIC_URL is correct (if using custom domain)

### Storage limit errors

The system checks storage limits before upload. If you see limit errors:
1. Check current usage in the Media Library stats
2. Delete unused files
3. Consider upgrading to a higher plan

## Migration from Supabase Storage

If you have existing media in Supabase storage:

1. The old files will remain in Supabase until manually migrated
2. New uploads will go to R2
3. Consider running a migration script to move existing files to R2

## Security Considerations

- API credentials are only used server-side
- Files are uploaded through API endpoints with authentication
- Deletion is authorized and tracks ownership
- Storage limits are enforced server-side

## Costs

Cloudflare R2 pricing:
- **Storage**: $0.015 per GB per month
- **Class A operations** (writes): $4.50 per million requests
- **Class B operations** (reads): $0.36 per million requests
- **No egress fees** (unlike AWS S3)

For typical usage with the storage limits:
- Professional (250MB): ~$0.004/month storage cost
- Enterprise (500MB): ~$0.008/month storage cost