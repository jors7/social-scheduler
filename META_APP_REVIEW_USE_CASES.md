# Meta App Review - Permission Use Cases Documentation

## App: SocialCal Publisher
**App ID**: [Your App ID]  
**Business Verification**: [Status]  
**Review Status**: Pending

## Overview
SocialCal is a legitimate social media management platform that helps businesses and content creators schedule and publish content across multiple social media platforms, including Facebook, Instagram, and Threads. Our application provides essential scheduling, analytics, and content management features for professional social media management.

## Requested Permissions and Use Cases

### 1. public_profile
**Permission Scope**: `public_profile`  
**Access Level**: Advanced Access

**Use Case**:
We need public_profile to identify users and personalize their experience within our application. This allows us to:
- Display the user's name in the application interface
- Show which Facebook account is connected
- Provide account-specific features and settings
- Ensure the correct user is authorizing our application

**User Flow**:
1. User clicks "Connect Facebook" in SocialCal settings
2. Facebook OAuth dialog appears requesting public_profile permission
3. User authorizes the permission
4. We store the user's Facebook ID and name for identification
5. User sees their Facebook account listed in connected accounts

**Data Handling**:
- We only store the user's Facebook ID and display name
- Data is encrypted and stored securely in our database
- Users can disconnect and delete this data at any time

### 2. pages_show_list
**Permission Scope**: `pages_show_list`  
**Access Level**: Advanced Access

**Use Case**:
This permission is essential for users to select which Facebook Pages they want to manage through SocialCal. Without this, users cannot see or choose their pages for content publishing.

**User Flow**:
1. After connecting Facebook account, user sees "Select Pages to Manage"
2. We fetch the list of pages the user manages
3. User selects which pages to connect to SocialCal
4. Selected pages appear in the posting interface

**Why We Need This**:
- Users often manage multiple Facebook Pages
- They need to select specific pages for content scheduling
- Different pages may have different content strategies
- Team members may have access to different pages

**Data Handling**:
- We only store page IDs and names for selected pages
- Page list is fetched dynamically, not cached
- Users control which pages are connected

### 3. pages_read_engagement
**Permission Scope**: `pages_read_engagement`  
**Access Level**: Advanced Access

**Use Case**:
Analytics and engagement metrics are crucial for social media managers to understand their content performance and optimize their strategy.

**User Flow**:
1. User publishes content to Facebook Page through SocialCal
2. User navigates to Analytics dashboard
3. We fetch engagement metrics (likes, comments, shares, reach)
4. User sees performance data in charts and tables
5. User makes data-driven decisions for future content

**Specific Metrics We Display**:
- Post reach and impressions
- Engagement rate
- Like, comment, and share counts
- Best performing posts
- Audience growth trends

**Why This Is Essential**:
- Social media managers need to track ROI
- Content strategy requires performance data
- Clients expect engagement reports
- A/B testing requires metrics comparison

**Data Handling**:
- Metrics are fetched on-demand, not stored permanently
- Aggregated data may be cached for performance
- Users can delete all analytics data

### 4. pages_manage_posts
**Permission Scope**: `pages_manage_posts`  
**Access Level**: Advanced Access

**Use Case**:
This is our core functionality - allowing users to create, schedule, and publish content to their Facebook Pages directly from SocialCal.

**User Flow**:
1. User creates content in SocialCal's composer
2. User selects target Facebook Pages
3. User chooses immediate posting or schedules for later
4. For immediate: Content posts directly to Facebook
5. For scheduled: Content is queued and posted at specified time
6. User receives confirmation of successful posting

**Content Types We Support**:
- Text posts with formatting
- Image posts (single and multiple)
- Video posts
- Link posts with previews
- Scheduled posts for optimal timing

**Scheduling Features**:
- Calendar view for content planning
- Bulk scheduling for campaigns
- Recurring posts for regular content
- Time zone management for global audiences
- Queue management and reordering

**Why This Is Our Core Feature**:
- Users save hours by managing all platforms from one place
- Consistent posting schedule improves engagement
- Batch content creation improves efficiency
- Team collaboration on content approval

**Data Handling**:
- Content is temporarily stored until posted
- Media files are deleted after successful posting
- Posted content metadata retained for analytics
- Failed posts are retried with user notification

### 5. pages_read_user_content
**Permission Scope**: `pages_read_user_content`  
**Access Level**: Advanced Access

**Use Case**:
This permission allows us to show users their published content history and manage their content library effectively.

**User Flow**:
1. User navigates to Content Library
2. We fetch previously posted content from Facebook
3. User can view, analyze, and repurpose successful content
4. User can identify content gaps and opportunities

**Features This Enables**:
- Content history and archives
- Repost successful content
- Content performance comparison
- Competitor analysis features
- Content audit capabilities

**Why This Improves User Experience**:
- Users can track their posting history
- Successful content can be identified and repeated
- Content gaps become visible
- ROI tracking requires historical data

**Data Handling**:
- Historical content fetched on-demand
- Cached temporarily for performance
- Users control data retention period

### 6. business_management
**Permission Scope**: `business_management`  
**Access Level**: Advanced Access

**Use Case**:
Many of our users manage multiple business accounts and need centralized management capabilities for their business assets.

**User Flow**:
1. Business owner connects their Business Manager account
2. They can manage multiple pages across different businesses
3. Team members get appropriate access levels
4. Advertising accounts can be linked for promoted posts
5. Business insights inform content strategy

**Business Features**:
- Multi-business account management
- Team member access control
- Business asset organization
- Cross-business analytics
- Bulk operations across businesses

**Why Businesses Need This**:
- Agencies manage multiple client accounts
- Franchises have multiple location pages
- Enterprises have subsidiary pages
- Marketing teams need role-based access

**Data Handling**:
- Business relationships are mapped but not stored
- Access permissions checked in real-time
- No business-sensitive data is cached

## Instagram Permissions (If Applicable)

### instagram_basic
**Use Case**: Display Instagram account information and enable account connection

### instagram_content_publish
**Use Case**: Publish photos, videos, and carousel posts to Instagram business accounts

### instagram_manage_insights
**Use Case**: Show post performance and account analytics

## Threads Permissions (If Applicable)

### threads_basic
**Use Case**: Basic Threads account access and identification

### threads_content_publish
**Use Case**: Publish text and media posts to Threads

## Evidence of Legitimate Use

### Business Model
- **Subscription-based SaaS**: Users pay monthly/yearly for our service
- **Tiered pricing**: Based on number of accounts and features
- **No data selling**: We never sell user or platform data
- **B2B focus**: Targeting businesses and professionals

### User Base
- Social media managers
- Marketing agencies
- Small business owners
- Content creators
- Enterprise marketing teams

### Platform Website
- URL: https://socialcal.app
- Privacy Policy: https://socialcal.app/privacy
- Terms of Service: https://socialcal.app/terms
- Data Deletion: https://socialcal.app/data-deletion-status

### Similar Approved Apps
Our use case is similar to established social media management platforms:
- Hootsuite
- Buffer
- Sprout Social
- Later
- Planoly

## Security and Compliance

### Data Security
- All tokens encrypted with AES-256
- HTTPS/TLS for all API communications
- Row-level security in database
- Regular security audits

### Compliance
- GDPR compliant with user rights
- CCPA compliant for California users
- Meta Platform Terms compliance
- Regular compliance reviews

### User Control
- Immediate account disconnection
- Complete data deletion option
- Granular permission controls
- Transparent data usage

## Test Instructions for Reviewers

### Test Account Setup
1. Create account at https://socialcal.app/signup
2. Use test credentials: [Provide test account]
3. Navigate to Settings > Social Accounts
4. Click "Connect Facebook"

### Testing Core Features
1. **Connection**: Connect a Facebook Page
2. **Posting**: Create and publish a test post
3. **Scheduling**: Schedule a post for future
4. **Analytics**: View post performance
5. **Disconnection**: Remove Facebook connection

### Expected Behavior
- Smooth OAuth flow with clear permission requests
- Successful posting to Facebook Pages
- Accurate analytics display
- Clean disconnection with data removal

## Video Demonstration
[Link to screencast showing the complete user flow]

## Additional Notes

### Rate Limiting
- We implement appropriate rate limiting to respect Meta's API limits
- Exponential backoff for retries
- User notifications for rate limit issues

### Error Handling
- Clear error messages for users
- Fallback mechanisms for API failures
- Support team for issue resolution

### Future Enhancements
- Story posting capabilities
- Reels scheduling
- Advanced analytics dashboard
- AI-powered content suggestions

## Contact Information

**Developer Contact**: [Your Name]  
**Email**: support@socialcal.app  
**Business Email**: business@socialcal.app  
**Technical Contact**: dev@socialcal.app

## Declaration

We confirm that:
1. We will only use permissions for stated purposes
2. We comply with Meta Platform Terms
3. We respect user privacy and data rights
4. We maintain appropriate security measures
5. We will notify Meta of any significant changes

---

*This document is prepared for Meta App Review to demonstrate legitimate use of requested permissions.*

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Prepared By**: [Your Name/Company]