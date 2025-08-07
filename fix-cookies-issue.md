# Quick Fix for Cookies Issue

The issue is that `cookies()` is being called at the module level in many API routes. In Next.js 14 with App Router, `cookies()` must be called inside the request handler, not at module level.

## Pattern to Fix:

### Before (WRONG):
```typescript
const cookieStore = cookies()  // <-- Called at module level
const supabase = createServerClient(...)

export async function POST(request: NextRequest) {
  // handler code
}
```

### After (CORRECT):
```typescript
export async function POST(request: NextRequest) {
  const cookieStore = cookies()  // <-- Called inside handler
  const supabase = createServerClient(...)
  // handler code
}
```

## Files that need fixing:
All files in /app/api that call cookies() at module level need to be updated to call it inside the request handler functions (GET, POST, etc.).

The build error shows this is preventing the app from deploying to Vercel.