# TikTok Production Deployment Checklist

## ✅ Local Changes Completed

1. **Updated .env.local** with your approved TikTok app credentials
2. **Fixed TikTok Service** to use environment variable for sandbox mode
3. **Updated Character Limit** from 150 to 2200 characters
4. **Fixed Success Response** for production posting

## 🚀 Deploy to Vercel

### Step 1: Commit and Push Changes
```bash
git add .
git commit -m "Enable TikTok production posting with approved app"
git push origin main
```

### Step 2: Update Vercel Environment Variables

Go to your Vercel dashboard → Settings → Environment Variables and update/add:

```
TIKTOK_CLIENT_KEY=aw5ervnsbpztdk43
TIKTOK_CLIENT_SECRET=WBpgFpn2OR4SpzTv59pz9k1P4GGtwhCR  
TIKTOK_SANDBOX=false
```

### Step 3: Redeploy
After updating environment variables, trigger a new deployment:
- Go to Deployments tab
- Click "Redeploy" on the latest deployment
- Wait for deployment to complete

## 📱 Connect TikTok Account (Production)

### Step 1: Go to Settings
1. Visit https://www.socialcal.app/dashboard/settings
2. Find TikTok in the social accounts section

### Step 2: Connect Account
1. Click "Connect" next to TikTok
2. Log in with your TikTok account
3. Authorize the app with these permissions:
   - `user.info.basic` - Basic profile information
   - `video.publish` - Publish videos
   - `video.upload` - Upload video content

### Step 3: Verify Connection
- You should see your TikTok username displayed
- Status should show as "Connected"

## 🎥 Test Production Posting

### Step 1: Create a Test Post
1. Go to https://www.socialcal.app/dashboard/create/new
2. Select TikTok as the platform
3. Write your caption (up to 2200 characters)
4. Upload a video (MP4 format recommended)

### Step 2: Configure Settings
- **Privacy Level**: 
  - `Public` for everyone to see
  - `Friends` for mutual followers only
  - `Private` to save as draft

### Step 3: Post
1. Click "Post Now" to publish immediately
2. Or click "Schedule" for future posting

### Step 4: Verify on TikTok
- Check your TikTok profile after 30 seconds to 2 minutes
- Videos need processing time before appearing

## ⚠️ Important Notes

### Video Requirements
- **Format**: MP4, MOV, MPEG, 3GP, or AVI
- **Resolution**: Minimum 720x1280 (9:16 aspect ratio recommended)
- **Duration**: 3 seconds to 10 minutes
- **Size**: Up to 4GB
- **Bitrate**: Higher than 516 kbps

### Current Status
- ✅ **Production App Approved**: Your app is approved for production
- ✅ **Basic Scopes Active**: Publishing and user info
- ⏳ **Analytics Scopes**: Require separate approval (Phase 2)

### Troubleshooting

**"TikTok requires a video"**
- Ensure you're uploading a video file, not an image

**"Authentication failed"**
- Reconnect your TikTok account in settings

**"Scope not authorized"**  
- Your app needs the video.publish scope
- Check TikTok Developer Portal

**Video doesn't appear**
- Wait 2-3 minutes for processing
- Check video meets requirements
- Verify privacy settings

## 📊 Analytics (Coming Soon)

Phase 2 features requiring additional TikTok approval:
- Follower growth tracking
- Video performance metrics
- Engagement analytics
- Cross-platform comparison

## 🎉 Success!

Once deployed and TikTok account connected, you can:
- Post videos directly to TikTok (not just drafts)
- Use full 2200 character captions
- Schedule posts for optimal times
- Track posts in your dashboard

Your TikTok integration is production-ready! 🚀