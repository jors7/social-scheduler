# Threads Integration Guide

## Overview
SocialCal now supports Threads posting through Instagram Business Accounts. This integration uses Meta's Graph API to publish content to Threads.

## Requirements

For Threads integration to work, users must have:

1. **Instagram Business or Creator Account** - Instagram account must be:
   - Converted to a Business or Creator account (not Personal)
   - This can be done in Instagram app settings
2. **Threads Profile** - The Instagram account must have an active Threads profile
3. **Proper Permissions** - Grant Instagram permissions during OAuth

Note: A Facebook Page is NOT required. Users can connect their Instagram Business/Creator accounts directly.

## How It Works

### Authentication Flow

1. User clicks "Connect Threads" in settings
2. OAuth flow requests minimal permissions:
   - `instagram_basic` - Access Instagram account info
   - `instagram_content_publish` - Publish content to Instagram/Threads

3. After authorization, the system:
   - Checks for Instagram Business/Creator accounts
   - First looks for any pages with Instagram accounts (some Creator accounts)
   - Then checks if user has Instagram Business account directly linked
   - Stores the Instagram Business Account ID for Threads posting

### Posting to Threads

The Threads API uses a two-step process:

1. **Create Media Container**
   - Endpoint: `/{ig-user-id}/threads`
   - Creates a container with text and optional image
   - Returns a creation ID

2. **Publish Thread**
   - Endpoint: `/{ig-user-id}/threads_publish`
   - Publishes the created container
   - Returns the published Thread ID

### API Endpoints

- **OAuth Start**: `/api/auth/threads`
- **OAuth Callback**: `/api/auth/threads/callback`
- **Threads Client**: `/lib/threads/client.ts`
- **Threads Service**: `/lib/threads/service.ts`

## Common Issues

### "Invalid Scopes" Error
- The scopes `threads_basic` and `threads_content_publish` don't exist
- Threads access is granted through Instagram permissions

### "No Instagram Business Account Found"
- Convert Instagram to Business/Creator account in Instagram settings
- This can be done directly in the Instagram app
- No Facebook Page is required

### "No Threads Profile Found"
- User must have an active Threads account
- Sign up for Threads through the mobile app first

## Testing

Use the test endpoint to verify OAuth URL generation:
```
GET /api/test/threads-auth
```

## Implementation Details

### Database Schema
Threads accounts are stored in the `social_accounts` table with:
- `platform`: 'threads'
- `platform_user_id`: Instagram Business Account ID
- `access_token`: Page Access Token for API calls
- `username`: Instagram/Threads username

### Character Limits
- Threads posts: 500 characters max
- Similar to Twitter but with more space

### Media Support
- Images: JPEG, PNG formats
- Videos: Not yet implemented
- Multiple images: Not yet implemented

## Future Improvements

1. Add video support for Threads
2. Implement carousel posts (multiple images)
3. Add Threads-specific analytics
4. Support for replies and threads (conversation threads)
5. Implement Threads insights API

## References

- [Meta Threads API Documentation](https://developers.facebook.com/docs/threads)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Meta App Dashboard](https://developers.facebook.com/apps)