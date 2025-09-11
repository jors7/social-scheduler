# Threads API Permissions - Technical Documentation

## Current Permission Status

### ✅ Approved Permissions
| Permission | Scope | What It Allows |
|------------|-------|----------------|
| `threads_basic` | Basic Access | Read basic account information |
| `threads_content_publish` | Publishing | Create and publish posts to Threads |

### ❌ Not Approved Permissions
| Permission | Scope | What We Need It For | Current Workaround |
|------------|-------|---------------------|-------------------|
| `threads_manage_replies` | Reply Management | Creating connected threads using `reply_to_id` | Test accounts bypass this; production uses numbered posts |
| `threads_manage_insights` | Analytics | Fetching post performance metrics | Simulated analytics for demo |
| `threads_read_replies` | Reply Reading | Reading replies to posts | Not currently needed |

## How Multi-Post Threads Work

### Test Accounts (Special Privileges)
Test accounts registered in Meta App Dashboard can use `reply_to_id` without `threads_manage_replies`:

```javascript
// This works for test accounts
const params = {
  text: "Reply post content",
  reply_to_id: "previous_post_id", // Creates actual thread connection
  access_token: "test_account_token"
}
```

**Result**: Creates real connected threads with visual reply indicators

### Production Accounts (Standard Users)
Without `threads_manage_replies`, production accounts cannot use `reply_to_id`:

```javascript
// This fails for production accounts
const params = {
  text: "Reply post content",
  reply_to_id: "previous_post_id", // ❌ Permission error
  access_token: "production_token"
}

// Fallback solution
const params = {
  text: "[2/3] Reply post content", // Numbered prefix
  access_token: "production_token"
}
```

**Result**: Creates separate posts with [n/total] numbering

## Implementation Architecture

### 1. Primary Attempt - Connected Thread
```typescript
// /api/post/threads/thread/route.ts
try {
  for (let i = 0; i < posts.length; i++) {
    const params = {
      text: posts[i],
      media_type: 'TEXT',
      access_token: accessToken,
      ...(i > 0 && { reply_to_id: previousPostId }) // Add for replies
    }
    
    const response = await createThreadPost(params)
    previousPostId = response.id
  }
  return { success: true, isConnectedThread: true }
} catch (error) {
  if (isPermissionError(error)) {
    // Trigger fallback
    throw new Error('threads_manage_replies permission required')
  }
}
```

### 2. Fallback - Numbered Posts
```typescript
// /api/post/threads/thread-numbered/route.ts
for (let i = 0; i < posts.length; i++) {
  const numberedText = `[${i + 1}/${posts.length}] ${posts[i]}`
  const params = {
    text: numberedText,
    media_type: 'TEXT',
    access_token: accessToken
    // No reply_to_id - creates separate posts
  }
  
  await createThreadPost(params)
}
return { success: true, isNumberedThread: true }
```

### 3. Client-Side Intelligence
```typescript
// /app/dashboard/create/new/page.tsx
const postToThreads = async (posts: string[]) => {
  // Try connected thread first
  let response = await fetch('/api/post/threads/thread', ...)
  
  if (!response.ok) {
    const error = await response.json()
    
    // Detect permission issue
    if (error.message?.includes('threads_manage_replies')) {
      // Automatic fallback
      response = await fetch('/api/post/threads/thread-numbered', ...)
    }
  }
  
  // Handle response
  const data = await response.json()
  if (data.isConnectedThread) {
    toast.success('Posted as connected thread (test account)')
  } else if (data.isNumberedThread) {
    toast.info('Posted as numbered thread (standard account)')
  }
}
```

## Permission Error Detection

### Error Patterns We Check
```javascript
const isPermissionError = (error) => {
  const message = error.message?.toLowerCase() || ''
  return (
    message.includes('reply_to_id') ||
    message.includes('permission') ||
    message.includes('threads_manage_replies') ||
    message.includes('oauth') ||
    message.includes('scope')
  )
}
```

### Typical Error Responses
```json
// Permission denied error
{
  "error": {
    "message": "Invalid parameter: reply_to_id requires threads_manage_replies permission",
    "type": "OAuthException",
    "code": 100
  }
}

// Scope not granted error
{
  "error": {
    "message": "The user has not granted your app the threads_manage_replies permission",
    "type": "OAuthException",
    "code": 200
  }
}
```

## Testing Scenarios

### Scenario 1: Test Account Success
1. User: @thejanorsula (test account)
2. Action: Create 3-post thread
3. API: Uses `/api/post/threads/thread`
4. Result: Connected thread with replies
5. Verification: Check Threads.net for reply indicators

### Scenario 2: Production Account Fallback
1. User: Regular account
2. Action: Create 3-post thread
3. API: Tries `/api/post/threads/thread`, fails, uses `/api/post/threads/thread-numbered`
4. Result: Three separate posts with [1/3], [2/3], [3/3]
5. Verification: Check Threads.net for numbered posts

### Scenario 3: Single Post (No Thread)
1. User: Any account
2. Action: Create single post
3. API: Uses `/api/post/threads/thread`
4. Result: Single post (no reply_to_id needed)
5. Verification: Works for all account types

## Future Considerations

### When Permissions Are Approved
Once Meta approves `threads_manage_replies`:
1. Remove fallback logic
2. All accounts use connected threads
3. Update UI messaging
4. Migration path for numbered posts (optional)

### Code Changes Required
```typescript
// Future simplified version
const postToThreads = async (posts: string[]) => {
  // Direct call - no fallback needed
  const response = await fetch('/api/post/threads/thread', {
    method: 'POST',
    body: JSON.stringify({ posts, accessToken, userId })
  })
  
  return response.json()
}
```

## Requesting Permission Approval

### Steps for Meta App Review
1. **Record Demo Video**: Show the feature working with test account
2. **Explain Use Case**: "Users create multi-part content that needs threading"
3. **Show User Flow**: Dashboard → Create → Multi-post → Published thread
4. **Highlight Value**: Better user experience, organized content
5. **Submit for Review**: Through Meta App Dashboard

### Sample Request Text
```
Permission: threads_manage_replies

Use Case: Our social media scheduling platform allows users to create 
multi-part content (threads) that need to be connected as replies. This 
creates a better reading experience and keeps related content together.

User Flow:
1. User composes multiple related posts in our editor
2. User clicks "Post as Thread"
3. We use reply_to_id to connect posts
4. Users see organized thread on Threads

Without this permission, we have to post numbered separate posts [1/3], 
[2/3], etc., which provides a suboptimal user experience.
```

## Monitoring & Analytics

### Track Success Rates
```sql
-- Query to analyze thread posting success
SELECT 
  COUNT(*) as total_attempts,
  SUM(CASE WHEN is_connected_thread THEN 1 ELSE 0 END) as connected_success,
  SUM(CASE WHEN is_numbered_thread THEN 1 ELSE 0 END) as numbered_fallback,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failures
FROM thread_posts
WHERE platform = 'threads';
```

### User Feedback Collection
- Monitor user complaints about numbered posts
- Track requests for "real" threading
- Document use cases for Meta review

## Support Documentation

### FAQ for Users

**Q: Why are my thread posts numbered instead of connected?**
A: This happens for standard accounts due to API limitations. Test accounts can create connected threads.

**Q: How do I get test account access?**
A: Contact support to be added as a tester in our Meta app.

**Q: Will connected threads be available for everyone?**
A: Yes, once Meta approves our permission request.

**Q: Do numbered threads perform worse?**
A: No significant performance difference has been observed.

## Developer Notes

### Environment Variables
```bash
# No special config needed for fallback
THREADS_APP_ID=your_app_id
THREADS_APP_SECRET=your_app_secret
# Permission handling is automatic
```

### Error Logging
```typescript
// Log permission errors for monitoring
if (error.includes('threads_manage_replies')) {
  console.log('[Threads] Permission fallback triggered', {
    userId,
    accountType: isTestAccount ? 'test' : 'production',
    fallbackUsed: true,
    timestamp: new Date().toISOString()
  })
}
```

### Performance Considerations
- Numbered posts create faster (no reply validation)
- Connected threads have slight delay between posts
- Both methods respect rate limits (60 posts/hour)