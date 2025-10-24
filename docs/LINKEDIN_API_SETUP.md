# LinkedIn Analytics API Setup Guide

This guide walks you through the process of applying for LinkedIn Community Management API access to enable analytics features in SocialCal.

## Overview

LinkedIn requires approval for the **Community Management API** to access post analytics data. This is a separate product from the basic "Sign In with LinkedIn" and "Share on LinkedIn" features.

### What You'll Get Access To

Once approved, you'll be able to retrieve:

- **Post Impressions**: Total views of your posts
- **Members Reached**: Unique LinkedIn members who viewed your content
- **Reactions**: Likes and other engagement reactions
- **Comments**: Number of comments on posts
- **Reshares**: How many times content was shared
- **Engagement Rate**: Calculated interaction percentage

### Two API Programs Available

1. **Member Post Analytics** (Personal Profiles)
   - **Scope**: `r_member_postAnalytics`
   - **Access**: Free, requires Community Management API approval
   - **Use Case**: Analytics for personal LinkedIn profile posts
   - **Status**: ✅ **Prioritized** - Easier to get approved, launched July 2025

2. **Organization Page Statistics** (Company Pages)
   - **Scope**: `rw_organization_admin`
   - **Access**: Requires admin role on organization page
   - **Use Case**: Analytics for company/organization page posts
   - **Status**: ⏳ Future implementation

## Step-by-Step Application Process

### Prerequisites

Before applying:
- ✅ LinkedIn Developer Account created
- ✅ LinkedIn App created in Developer Portal
- ✅ Basic OAuth implemented ("Sign In with LinkedIn")
- ✅ Posting functionality working ("Share on LinkedIn")

### Step 1: Access LinkedIn Developer Portal

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Click **"My Apps"** in the top navigation
3. Select your existing app or create a new one

### Step 2: Add Community Management API Product

1. In your app dashboard, go to the **"Products"** tab
2. Find **"Community Management API"** in the product catalog
3. Click **"Request access"** or **"Add product"**
4. You'll see a form to complete

### Step 3: Complete Application Form

The application form typically requires:

#### Required Information

**App Details:**
- App name and description
- App logo (minimum 100x100px)
- Privacy policy URL
- Terms of service URL

**Use Case Description:**
```
SocialCal is a social media management platform that helps users schedule and publish content across multiple platforms, including LinkedIn. We request Community Management API access to provide our users with:

1. Post Performance Analytics: Display impressions, reach, engagement metrics for LinkedIn posts created through our platform
2. Historical Data Tracking: Store analytics over time to show trends and performance improvements
3. Engagement Insights: Help users understand which content resonates with their LinkedIn audience

Our users post content from personal LinkedIn profiles and need to see how their posts are performing to optimize their content strategy.
```

**Technical Implementation:**
- OAuth 2.0 flow implemented
- Scopes requested: `openid`, `profile`, `email`, `w_member_social`, `r_member_postAnalytics`
- Analytics data displayed in dashboard with refresh capability
- Historical data stored for trend analysis

**Data Handling:**
- Analytics data stored securely in Supabase PostgreSQL database
- Row-level security ensures users only see their own data
- Data retention: 12 months of historical analytics
- Compliance with LinkedIn API Terms of Service

### Step 4: Access Tiers

LinkedIn has two access tiers:

#### Development Tier
- **Purpose**: Build and test your integration
- **Restrictions**: API call limitations
- **Duration**: 12 months to complete integration
- **Approval**: Typically 1-2 weeks

#### Standard Tier (Production)
- **Purpose**: Live production access with no restrictions
- **Approval Process**: Requires screen recording + test credentials
- **Timeline**: Additional 1-2 weeks after Development tier

### Step 5: Submit Screen Recording

For Standard tier access, you'll need to submit:

**Screen Recording Requirements:**
1. **Login Flow**: Show LinkedIn OAuth authentication
2. **Analytics Display**: Demonstrate fetching and displaying post analytics
3. **User Interface**: Show how users access analytics in your app
4. **Data Refresh**: Demonstrate analytics refresh functionality

**Recording Guidelines:**
- Duration: 2-5 minutes
- Format: MP4 or MOV
- Resolution: Minimum 720p
- Audio: Optional but recommended for narration

**Sample Script:**
```
1. "This is SocialCal's LinkedIn analytics integration"
2. Show user connecting LinkedIn account via OAuth
3. Navigate to Analytics dashboard
4. "Here users can see their LinkedIn post performance metrics"
5. Demonstrate metrics: impressions, reach, engagement
6. Click refresh button to show real-time data fetching
7. "All data is fetched via LinkedIn's Member Post Analytics API"
```

### Step 6: Provide Test Credentials

LinkedIn may request test credentials to review your app:

**What to Provide:**
- Test account username/email (create a dedicated test account)
- Test account password
- Any special instructions for accessing LinkedIn analytics features
- Sample LinkedIn posts to verify analytics fetching

**⚠️ Important**: Create a dedicated test account. Do NOT share your personal credentials.

### Step 7: Wait for Review

**Expected Timeline:**
- Initial review: 3-7 business days
- Development tier approval: 1-2 weeks
- Standard tier approval: Additional 1-2 weeks
- Total time: 2-4 weeks for full approval

**During Review:**
- LinkedIn may ask clarifying questions via email
- Check the Developer Portal for status updates
- Be responsive to any requests for additional information

## Post-Approval Configuration

Once approved, update your application:

### 1. Verify OAuth Scopes

The scopes have already been added to the app in:
```typescript
// File: app/api/auth/linkedin/route.ts
const SCOPES = [
  'openid',
  'profile',
  'email',
  'w_member_social',
  'r_member_postAnalytics',    // ✅ Already added
  'rw_organization_admin',     // ✅ For organization pages (future)
].join(' ');
```

### 2. Run Database Migration

Execute the LinkedIn analytics schema:

```bash
# Run in Supabase SQL Editor
# File: supabase/migrations/20250124_linkedin_analytics.sql
```

This creates:
- `linkedin_analytics` table for storing historical data
- `linkedin_api_quota` table for rate limit tracking
- Helper functions for analytics summaries
- Row-level security policies

### 3. Test API Access

Use the validation endpoint:

```bash
curl -X POST https://your-app.com/api/linkedin/member-analytics \
  -H "Content-Type: application/json" \
  -d '{"accountId": "your-account-id"}'
```

Expected response if approved:
```json
{
  "success": true,
  "accessStatus": {
    "hasMemberAnalytics": true,
    "hasOrganizationAnalytics": false
  }
}
```

### 4. Enable Cron Job

Add to `vercel.json` for scheduled analytics refresh:

```json
{
  "crons": [{
    "path": "/api/cron/refresh-linkedin-analytics",
    "schedule": "0 * * * *"
  }]
}
```

Set up cron secret in environment variables:
```bash
CRON_SECRET=your-secure-random-string
```

## Implementation Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│                   User Interface                     │
│  components/dashboard/analytics/linkedin-insights.tsx│
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                  API Endpoints                       │
│     /api/linkedin/member-analytics                   │
│     /api/cron/refresh-linkedin-analytics             │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              Analytics Service                       │
│     lib/linkedin/analytics-service.ts                │
│   - getMemberPostAnalytics()                         │
│   - getAggregatedMemberAnalytics()                   │
│   - getPostMetrics()                                 │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│            LinkedIn API                              │
│   GET /rest/memberCreatorPostAnalytics               │
│   - Requires: r_member_postAnalytics scope           │
│   - Returns: Impressions, reach, engagement          │
└──────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Connects LinkedIn** → OAuth with analytics scopes
2. **User Posts Content** → LinkedIn URN saved to database
3. **Cron Job Runs** (hourly) → Fetches analytics for recent posts
4. **Analytics Stored** → Historical data in `linkedin_analytics` table
5. **Dashboard Displays** → Real-time and historical metrics

## API Rate Limits

LinkedIn enforces rate limits on the Community Management API:

- **Member Post Analytics**: 100 requests per access token per day
- **Throttling**: Max 10 requests per second
- **Best Practice**: Cache analytics data, refresh hourly via cron

Our implementation includes:
- ✅ Rate limit tracking in `linkedin_api_quota` table
- ✅ Hourly cron job (within daily limits)
- ✅ Error handling for 429 (Rate Limit) responses
- ✅ Automatic retry with exponential backoff

## Troubleshooting

### Common Issues

**Issue**: `403 Forbidden` when fetching analytics
- **Cause**: API access not approved yet
- **Solution**: Check application status in Developer Portal
- **Fallback**: App shows "API Approval Required" message with application link

**Issue**: `401 Unauthorized` errors
- **Cause**: Access token expired or invalid
- **Solution**: Implement token refresh logic
- **Check**: Ensure `access_token` is stored and valid

**Issue**: No analytics data returned
- **Cause**: Post URN not properly stored
- **Solution**: Verify `post_results` contains LinkedIn URN after posting
- **Fix**: Update posting service to save URN in correct format

**Issue**: Rate limit exceeded
- **Cause**: Too many API requests
- **Solution**: Reduce cron frequency or implement better caching
- **Monitor**: Check `linkedin_api_quota` table

### Testing Without Approval

While waiting for approval, the app gracefully handles the lack of API access:

1. ✅ Shows "API Approval Required" message
2. ✅ Provides link to apply for access
3. ✅ Displays what analytics will be available
4. ✅ No errors or broken functionality

## Security Considerations

### Access Token Storage
- Tokens stored encrypted in Supabase
- Row-level security ensures isolation
- Tokens refreshed automatically

### Data Privacy
- Users can only see their own analytics
- Historical data automatically deleted after 12 months
- Compliance with LinkedIn API Terms

### API Credentials
- Never commit API keys to git
- Use environment variables for all secrets
- Rotate CRON_SECRET regularly

## Support & Resources

### LinkedIn Documentation
- [Community Management API Docs](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview)
- [Member Post Analytics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics)
- [API Terms of Service](https://www.linkedin.com/legal/l/marketing-api-terms)

### SocialCal Files
- Analytics Service: `lib/linkedin/analytics-service.ts`
- API Endpoint: `app/api/linkedin/member-analytics/route.ts`
- UI Component: `components/dashboard/analytics/linkedin-insights.tsx`
- Database Schema: `supabase/migrations/20250124_linkedin_analytics.sql`
- Cron Job: `app/api/cron/refresh-linkedin-analytics/route.ts`

### Getting Help
- LinkedIn Developer Forums
- SocialCal GitHub Issues
- LinkedIn Partner Support (after approval)

## Next Steps

After completing this setup:

1. ✅ **Apply for API Access** - Start the approval process today
2. ⏳ **Build with Mock Data** - Continue development while waiting
3. 🧪 **Test Integration** - Verify all components work correctly
4. 📊 **Deploy to Production** - Once approved, enable in production
5. 🚀 **Monitor Usage** - Track API quota and performance

---

**Last Updated**: January 24, 2025
**API Version**: LinkedIn Marketing API v202501
**Status**: Ready for application submission
