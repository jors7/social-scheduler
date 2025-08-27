# YouTube OAuth Setup Guide

## Google Cloud Console Configuration

### 1. Add Authorized Redirect URIs

You need to add BOTH your local and production redirect URIs in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add ALL of these:

```
http://localhost:3000/api/auth/youtube/callback
http://localhost:3001/api/auth/youtube/callback
https://www.socialcal.app/api/auth/youtube/callback
https://socialcal.app/api/auth/youtube/callback
```

6. Click **Save**

### 2. Enable Required APIs

Make sure these APIs are enabled:
- YouTube Data API v3
- YouTube Analytics API (optional)
- Google+ API (for user info)

### 3. OAuth Consent Screen

Ensure your OAuth consent screen includes:
- All required scopes
- Your production domain in authorized domains
- Proper app description

## Environment Variables

In your `.env.local`:
```env
# YouTube OAuth
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
```

## Testing

### Local Development
1. Access from `http://localhost:3001`
2. The redirect URI will automatically use localhost

### Production
1. Access from `https://www.socialcal.app`
2. The redirect URI will automatically use the production domain

## Common Errors

### Error: redirect_uri_mismatch
**Cause**: The redirect URI sent doesn't match any authorized URIs in Google Console
**Solution**: Add the exact URI shown in the error message to Google Console

### Error: invalid_client
**Cause**: Wrong client ID or secret
**Solution**: Verify environment variables match Google Console credentials

### Error: access_denied
**Cause**: User denied permissions or scopes not approved
**Solution**: Check OAuth consent screen configuration

## Scopes Required

The app requests these YouTube scopes:
- `https://www.googleapis.com/auth/youtube.upload` - Upload videos
- `https://www.googleapis.com/auth/youtube` - Manage YouTube account
- `https://www.googleapis.com/auth/youtube.readonly` - View YouTube data
- `https://www.googleapis.com/auth/userinfo.profile` - Get user profile

## Production Checklist

- [ ] Add production redirect URI to Google Console
- [ ] Verify OAuth consent screen is configured
- [ ] Test from production domain
- [ ] Check environment variables are set in Vercel
- [ ] Ensure APIs are enabled in Google Cloud