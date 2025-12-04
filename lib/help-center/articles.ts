export type FAQCategory = 'platform-connections' | 'posting-scheduling' | 'billing-subscription' | 'analytics'

export interface TocItem {
  id: string
  title: string
  level: number
}

export interface FAQArticle {
  id: string
  slug: string
  category: FAQCategory
  title: string
  description: string
  content: string
  updatedAt: Date
  keywords: string[]
}

export interface FAQCategoryInfo {
  id: FAQCategory
  name: string
  icon: string // Lucide icon name
}

export const faqCategories: FAQCategoryInfo[] = [
  { id: 'platform-connections', name: 'Platform Connections', icon: 'Link' },
  { id: 'posting-scheduling', name: 'Posting & Scheduling', icon: 'Calendar' },
  { id: 'analytics', name: 'Analytics', icon: 'BarChart3' },
  { id: 'billing-subscription', name: 'Billing & Plans', icon: 'CreditCard' },
]

export const faqArticles: FAQArticle[] = [
  // ============================================
  // PLATFORM CONNECTIONS
  // ============================================
  {
    id: 'connect-instagram',
    slug: 'connect-instagram',
    category: 'platform-connections',
    title: 'How to Connect Instagram',
    description: 'Connect your Instagram Business or Creator account to SocialCal',
    updatedAt: new Date('2025-01-15'),
    keywords: ['instagram', 'connect', 'business', 'creator'],
    content: `
## Prerequisites

Before connecting Instagram, you need:

- An **Instagram Business** or **Creator** account (not a personal account)
- A **Facebook Page** connected to your Instagram account

## Why These Requirements?

Instagram's API only allows posting through Business/Creator accounts that are linked to Facebook Pages. This is a requirement from Meta (Instagram's parent company), not SocialCal.

## Step-by-Step Instructions

1. Go to **Settings** in your SocialCal dashboard
2. Click on the **Social Accounts** tab
3. Find Instagram and click **Connect**
4. You'll be redirected to Instagram to authorize
5. Log in to your Instagram account if prompted
6. Grant all requested permissions
7. You'll be redirected back to SocialCal

## Troubleshooting

### "No Instagram accounts found"
- Make sure your Instagram is converted to a Business or Creator account
- Ensure your Instagram is linked to a Facebook Page
- Try disconnecting and reconnecting

### "Permissions error"
- Try disconnecting and reconnecting
- Make sure you granted all permissions during authorization

### Still having issues?
Contact us through the support form and we'll help you get connected.
    `.trim()
  },
  {
    id: 'connect-facebook',
    slug: 'connect-facebook',
    category: 'platform-connections',
    title: 'How to Connect Facebook',
    description: 'Connect your Facebook Page to post directly from SocialCal',
    updatedAt: new Date('2025-01-15'),
    keywords: ['facebook', 'connect', 'meta', 'page', 'business'],
    content: `
## Prerequisites

To connect Facebook, you need:

- A **Facebook Page** (not a personal profile)
- Admin or Editor access to that Page

## Important Note

SocialCal posts to Facebook **Pages**, not personal profiles. This is a requirement from Meta's API.

## Step-by-Step Instructions

1. Go to **Settings** in your SocialCal dashboard
2. Click on the **Social Accounts** tab
3. Find Facebook and click **Connect**
4. Log in to Facebook if prompted
5. Select the Page(s) you want to connect
6. Grant all requested permissions
7. Click **Done** to complete

## Managing Multiple Pages

If you have multiple Facebook Pages, you can select which ones to connect. Each Page will appear as a separate account in SocialCal.

## Troubleshooting

### "No pages found"
- Make sure you have at least one Facebook Page
- Check that you have admin or editor access to the Page

### Posts not appearing
- Verify the Page is still connected in Settings
- Check if the post was scheduled for the correct Page
    `.trim()
  },
  {
    id: 'connect-tiktok',
    slug: 'connect-tiktok',
    category: 'platform-connections',
    title: 'How to Connect TikTok',
    description: 'Connect your TikTok account to schedule and post videos',
    updatedAt: new Date('2025-01-15'),
    keywords: ['tiktok', 'connect', 'video', 'upload'],
    content: `
## Prerequisites

To connect TikTok, you need:

- A TikTok account (personal or business)
- The TikTok app installed on your phone (for verification)

## Step-by-Step Instructions

1. Go to **Settings** in your SocialCal dashboard
2. Click on the **Social Accounts** tab
3. Find TikTok and click **Connect**
4. You'll be redirected to TikTok to authorize
5. Log in to your TikTok account
6. Grant the requested permissions
7. You'll be redirected back to SocialCal

## Important Notes

### Video Requirements
- **Format**: MP4, WebM
- **Duration**: 3 seconds to 10 minutes
- **Size**: Up to 500MB
- **Aspect Ratio**: 9:16 (vertical) recommended

### Posting Limitations
- TikTok only supports **video** content (no images)
- Videos are uploaded as "direct post" to your profile
- Captions support hashtags and mentions

## Troubleshooting

### "Authorization failed"
- Try clearing your browser cookies and reconnecting
- Make sure you're logged into the correct TikTok account

### Video upload failed
- Check that your video meets the format requirements
- Ensure the video file isn't corrupted
    `.trim()
  },
  {
    id: 'connect-threads',
    slug: 'connect-threads',
    category: 'platform-connections',
    title: 'How to Connect Threads',
    description: 'Connect your Threads account via Meta',
    updatedAt: new Date('2025-01-15'),
    keywords: ['threads', 'connect', 'meta', 'instagram'],
    content: `
## Prerequisites

To connect Threads, you need:

- A Threads account (created via Instagram)
- An Instagram account linked to Threads

## How Threads Connection Works

Threads uses Meta authentication. When you connect Threads, you'll authorize through the Meta/Threads login.

## Step-by-Step Instructions

1. Go to **Settings** in your SocialCal dashboard
2. Click on the **Social Accounts** tab
3. Find Threads and click **Connect**
4. You'll be redirected to authorize via Meta
5. Grant the requested permissions
6. Click **Done** to complete

## Content on Threads

- **Text posts**: Up to 500 characters
- **Images**: Supported
- **Videos**: Up to 5 minutes
- **Links**: Supported (will show preview)

## Troubleshooting

### "Threads account not found"
- Make sure you have a Threads account created
- Your Threads account must be linked to your Instagram
    `.trim()
  },
  {
    id: 'connect-pinterest',
    slug: 'connect-pinterest',
    category: 'platform-connections',
    title: 'How to Connect Pinterest',
    description: 'Connect your Pinterest account to create and schedule pins',
    updatedAt: new Date('2025-01-15'),
    keywords: ['pinterest', 'connect', 'pins', 'boards'],
    content: `
## Prerequisites

To connect Pinterest, you need:

- A Pinterest Business account (free to create)
- At least one board to pin to

## Why Business Account?

Pinterest's API only works with Business accounts. You can easily convert your personal account to a Business account for free in Pinterest settings.

## Step-by-Step Instructions

1. Go to **Settings** in your SocialCal dashboard
2. Click on the **Social Accounts** tab
3. Find Pinterest and click **Connect**
4. Log in to Pinterest if prompted
5. Grant the requested permissions
6. Select which boards you want to use
7. Click **Done** to complete

## Creating Pins

When creating a post for Pinterest:

- **Image required**: Pinterest is a visual platform
- **Select a board**: Choose which board to pin to
- **Add description**: Use keywords for discoverability
- **Add link**: Drive traffic to your website

## Pin Requirements

- **Image formats**: JPG, PNG
- **Recommended size**: 1000 x 1500 pixels (2:3 ratio)
- **Max file size**: 20MB
    `.trim()
  },
  {
    id: 'connect-bluesky',
    slug: 'connect-bluesky',
    category: 'platform-connections',
    title: 'How to Connect Bluesky',
    description: 'Connect your Bluesky account using your handle and app password',
    updatedAt: new Date('2025-01-15'),
    keywords: ['bluesky', 'connect', 'atproto', 'app password'],
    content: `
## How Bluesky Connection Works

Bluesky uses the AT Protocol, which requires an **App Password** instead of OAuth. This is a secure way to connect without sharing your main password.

## Step-by-Step Instructions

### 1. Create an App Password in Bluesky

1. Open the Bluesky app or go to bsky.app
2. Go to **Settings** > **App Passwords**
3. Click **Add App Password**
4. Give it a name like "SocialCal"
5. Copy the generated password

### 2. Connect in SocialCal

1. Go to **Settings** in your SocialCal dashboard
2. Click on the **Social Accounts** tab
3. Find Bluesky and click **Connect**
4. Enter your Bluesky handle (e.g., yourname.bsky.social)
5. Paste the App Password you created
6. Click **Connect**

## Security Note

App Passwords are secure because:
- They can only be used for API access, not logging in
- You can revoke them anytime without changing your main password
- Each app can have its own password

## Posting to Bluesky

- **Character limit**: 300 characters
- **Images**: Supported (up to 4)
- **Links**: Automatically detected and converted
- **Mentions**: Use @handle format

## Troubleshooting

### "Invalid credentials"
- Double-check your handle includes the full domain (e.g., .bsky.social)
- Make sure you're using an App Password, not your main password
- Verify the App Password hasn't been revoked
    `.trim()
  },
  {
    id: 'connect-linkedin',
    slug: 'connect-linkedin',
    category: 'platform-connections',
    title: 'How to Connect LinkedIn',
    description: 'Connect your LinkedIn profile to post updates',
    updatedAt: new Date('2025-01-15'),
    keywords: ['linkedin', 'connect', 'profile', 'professional'],
    content: `
## Prerequisites

To connect LinkedIn, you need:

- A LinkedIn account
- Note: We currently support **personal profiles only**, not Company Pages

## Important Note

SocialCal currently supports posting to LinkedIn **personal profiles** only. Company Page posting is not yet available.

## Step-by-Step Instructions

1. Go to **Settings** in your SocialCal dashboard
2. Click on the **Social Accounts** tab
3. Find LinkedIn and click **Connect**
4. You'll be redirected to LinkedIn to authorize
5. Log in to your LinkedIn account if prompted
6. Grant all requested permissions
7. You'll be redirected back to SocialCal

## Content on LinkedIn

- **Text posts**: Up to 3,000 characters
- **Images**: Supported
- **Videos**: Supported
- **Links**: Supported with preview

## Best Practices

- Keep posts professional and valuable
- Use line breaks for readability
- Avoid excessive hashtags (3-5 max)
- Engage with comments for better reach

## Troubleshooting

### "Authorization failed"
- Try clearing your browser cookies and reconnecting
- Make sure you're logged into the correct LinkedIn account

### Posts not appearing
- Verify your account is still connected in Settings
- Check LinkedIn's content policies
    `.trim()
  },
  {
    id: 'connect-twitter',
    slug: 'connect-twitter',
    category: 'platform-connections',
    title: 'How to Connect X (Twitter)',
    description: 'Connect your X/Twitter account to post tweets',
    updatedAt: new Date('2025-01-15'),
    keywords: ['twitter', 'x', 'connect', 'tweet'],
    content: `
## Prerequisites

To connect X (Twitter), you need:

- An X/Twitter account

## Step-by-Step Instructions

1. Go to **Settings** in your SocialCal dashboard
2. Click on the **Social Accounts** tab
3. Find X (Twitter) and click **Connect**
4. You'll be redirected to X to authorize
5. Log in to your X account if prompted
6. Grant all requested permissions
7. You'll be redirected back to SocialCal

## Content on X

- **Text posts**: Up to 280 characters
- **Images**: Up to 4 images per post
- **Videos**: Supported
- **Links**: Supported (counts toward character limit)

## Tips for X

- Keep it concise - 280 characters max
- Use hashtags strategically (1-2 per post)
- Engage with trending topics
- Thread longer content across multiple posts

## Troubleshooting

### "Authorization failed"
- Try clearing your browser cookies and reconnecting
- Make sure you're logged into the correct X account

### Posts not appearing
- Verify your account is still connected in Settings
- Check X's content policies
    `.trim()
  },
  {
    id: 'connect-youtube',
    slug: 'connect-youtube',
    category: 'platform-connections',
    title: 'How to Connect YouTube',
    description: 'Connect your YouTube channel to upload videos and Shorts',
    updatedAt: new Date('2025-01-15'),
    keywords: ['youtube', 'connect', 'video', 'shorts', 'channel'],
    content: `
## Prerequisites

To connect YouTube, you need:

- A Google account
- A YouTube channel

## Step-by-Step Instructions

1. Go to **Settings** in your SocialCal dashboard
2. Click on the **Social Accounts** tab
3. Find YouTube and click **Connect**
4. You'll be redirected to Google to authorize
5. Select the Google account with your YouTube channel
6. Grant all requested permissions
7. You'll be redirected back to SocialCal

## Content on YouTube

- **Videos**: Standard videos and YouTube Shorts
- **Shorts**: Vertical videos under 60 seconds
- **Titles**: Up to 100 characters
- **Descriptions**: Up to 5,000 characters

## YouTube Shorts

To post a YouTube Short:
- Upload a vertical video (9:16 aspect ratio)
- Keep it under 60 seconds
- Enable the "Post as Short" option in SocialCal

## Troubleshooting

### "No channel found"
- Make sure you have a YouTube channel created
- Verify you're logged into the correct Google account

### Upload failed
- Check video format (MP4 recommended)
- Ensure video meets size requirements
- Verify your channel is in good standing
    `.trim()
  },
  {
    id: 'multiple-accounts',
    slug: 'multiple-accounts',
    category: 'platform-connections',
    title: 'Managing Multiple Accounts',
    description: 'Connect and manage multiple accounts on the same platform',
    updatedAt: new Date('2025-01-15'),
    keywords: ['multiple', 'accounts', 'manage', 'switch', 'several'],
    content: `
## Connecting Multiple Accounts

SocialCal allows you to connect multiple accounts from the same platform. For example, you can connect:

- Multiple Instagram Business accounts
- Multiple Facebook Pages
- Multiple TikTok accounts
- Multiple YouTube channels
- And more...

## How to Add Another Account

1. Go to **Settings** > **Social Accounts**
2. Find the platform you want to add another account for
3. Click **Connect** again
4. Authorize the new account
5. Both accounts will now appear in your list

## Account Limits by Plan

The number of accounts you can connect depends on your plan:

- **Starter**: 5 accounts total (across all platforms)
- **Professional**: 15 accounts total
- **Enterprise**: Unlimited accounts

## Managing Your Accounts

### Viewing All Accounts
Go to **Settings** > **Social Accounts** to see all your connected accounts organized by platform.

### Disconnecting an Account
Click the disconnect button next to any account to remove it. This won't delete any posts already published.

### Reconnecting an Account
If an account becomes disconnected (e.g., token expired), click **Reconnect** to authorize it again.

## Posting to Multiple Accounts

When creating a post, you can select which specific accounts to post to:

1. Create your post
2. In the platform selection, click the dropdown arrow next to a platform
3. Select which accounts on that platform should receive the post
4. You can select different accounts for different platforms

## Tips for Managing Multiple Accounts

1. **Use clear names**: Rename accounts in Settings to easily identify them
2. **Check before posting**: Always verify which accounts are selected
3. **Review analytics separately**: Each account has its own analytics data
4. **Stay within limits**: Keep track of your connected accounts count
    `.trim()
  },

  // ============================================
  // POSTING & SCHEDULING
  // ============================================
  {
    id: 'create-post',
    slug: 'create-post',
    category: 'posting-scheduling',
    title: 'How to Create a Post',
    description: 'Learn how to create and publish posts to multiple platforms',
    updatedAt: new Date('2025-01-15'),
    keywords: ['create', 'post', 'publish', 'content', 'write'],
    content: `
## Creating Your First Post

1. Click **Create New Post** in the sidebar or dashboard
2. Write your content in the editor
3. Select which platforms to post to
4. Add media (images or videos) if desired
5. Click **Post Now** or **Schedule**

## The Post Editor

### Rich Text Formatting
- **Bold** and *italic* text
- Links (highlight text and click link icon)
- Emoji support

### Platform Selection
Click on platform icons to select where to post. Connected platforms show in color, disconnected ones are grayed out.

### Character Counts
Each platform has different limits:
- **Twitter/X**: 280 characters
- **Bluesky**: 300 characters
- **Threads**: 500 characters
- **Facebook**: 63,206 characters
- **Instagram**: 2,200 characters
- **LinkedIn**: 3,000 characters

The editor shows real-time character counts for each selected platform.

## Platform-Specific Content

Want different content for different platforms? Click **Customize per platform** to write unique versions for each platform while posting simultaneously.

## Adding Media

1. Click the image icon or drag and drop
2. Supported formats: JPG, PNG, GIF, MP4, WebM
3. Images are automatically optimized for each platform

## AI Caption Suggestions

Need help writing? Click the **AI** button to get caption suggestions based on your topic and selected tone (professional, casual, funny, etc.).
    `.trim()
  },
  {
    id: 'multi-platform-posting',
    slug: 'multi-platform-posting',
    category: 'posting-scheduling',
    title: 'How to Post to Multiple Platforms',
    description: 'Post the same content across multiple social networks at once',
    updatedAt: new Date('2025-01-15'),
    keywords: ['multi-platform', 'cross-post', 'multiple', 'simultaneous'],
    content: `
## Posting to Multiple Platforms

SocialCal lets you create one post and publish it to multiple platforms simultaneously. This saves time while maintaining your presence across all your social channels.

## Step-by-Step Instructions

1. Click **Create New Post** in the sidebar
2. Write your content in the editor
3. Click on multiple platform icons to select them
4. Add your media (images or videos)
5. Click **Post Now** or **Schedule**

## Media Considerations

When posting to multiple platforms, keep in mind that each platform has different media requirements:

### Image Requirements
- Use images that work across all selected platforms
- **Recommended**: 1080x1080 (square) works on most platforms
- Pinterest prefers 2:3 vertical images
- Twitter/X prefers 16:9 horizontal images

### Video Requirements
- **TikTok**: Only supports video (9:16 vertical)
- **YouTube Shorts**: Under 60 seconds, vertical
- **Instagram Reels**: Up to 90 seconds, vertical
- **Other platforms**: Various aspect ratios supported

## Best Practice

For best results when posting to multiple platforms:

1. **Use universally compatible media**: Square images (1:1) work on most platforms
2. **Adjust aspect ratios**: If platforms need different ratios, create separate posts
3. **Check character limits**: Shorter content works across more platforms
4. **Use platform-specific content**: Click "Customize per platform" for tailored messaging

## Platform-Specific Customization

If you need different captions for different platforms:

1. Create your base post
2. Click **Customize per platform**
3. Edit the content for each platform individually
4. All versions will be posted at the same time
    `.trim()
  },
  {
    id: 'using-preview',
    slug: 'using-preview',
    category: 'posting-scheduling',
    title: 'How to Use the Preview',
    description: 'Preview how your post will look on each platform before publishing',
    updatedAt: new Date('2025-01-15'),
    keywords: ['preview', 'view', 'appearance', 'look'],
    content: `
## Previewing Your Posts

SocialCal provides a live preview of how your post will appear on each selected platform before you publish. This helps you catch any issues with formatting, character limits, or media display.

## Accessing the Preview

1. Create your post in the editor
2. Select your target platforms
3. The preview panel appears on the right side
4. Switch between platform tabs to see each preview

## What the Preview Shows

- **Your caption**: Formatted as it will appear
- **Media**: Images and videos positioned correctly
- **Character count**: Shows if you're over the limit
- **Profile info**: Your connected account details

## Preview by Platform

Each platform preview shows platform-specific elements:

- **Instagram**: Profile picture, caption, hashtags
- **Twitter/X**: Tweet format with character count
- **Facebook**: Page post format
- **LinkedIn**: Professional post layout
- **TikTok**: Video thumbnail and caption
- **Threads**: Thread post format
- **Bluesky**: Post card format
- **Pinterest**: Pin preview with board selection

## Tips for Using Preview

1. **Check all platforms**: Switch tabs to review each one
2. **Watch character limits**: Red text indicates you're over
3. **Preview media**: Make sure images/videos display correctly
4. **Review hashtags**: Ensure they're formatted properly
    `.trim()
  },
  {
    id: 'schedule-posts',
    slug: 'schedule-posts',
    category: 'posting-scheduling',
    title: 'How to Schedule Posts',
    description: 'Schedule posts to publish automatically at a specific time',
    updatedAt: new Date('2025-01-15'),
    keywords: ['schedule', 'time', 'date', 'automatic', 'queue'],
    content: `
## Scheduling a Post

1. Create your post as usual
2. Instead of clicking **Post Now**, click **Schedule**
3. Select the date and time
4. Choose your timezone
5. Click **Schedule Post**

## Managing Scheduled Posts

Go to **Posts** > **Scheduled** to see all your upcoming posts.

From here you can:
- **Edit**: Modify the content before it posts
- **Reschedule**: Change the date/time
- **Post Now**: Publish immediately
- **Cancel**: Remove from the queue

## Timezone Handling

SocialCal shows times in your local timezone. When you schedule a post for 9:00 AM, it will post at 9:00 AM in your timezone, regardless of where our servers are located.

## Best Times to Post

While it varies by audience, general guidelines:

- **Facebook**: 1-4 PM on weekdays
- **Instagram**: 11 AM - 1 PM and 7-9 PM
- **Twitter/X**: 8-10 AM and 6-9 PM
- **LinkedIn**: Tuesday-Thursday, 7-8 AM
- **TikTok**: 7-9 PM

## Unlimited Scheduling

All SocialCal plans (Starter, Professional, and Enterprise) include **unlimited scheduled posts**. Schedule as many posts as you need without any limits.
    `.trim()
  },
  {
    id: 'using-drafts',
    slug: 'using-drafts',
    category: 'posting-scheduling',
    title: 'How to Use Drafts',
    description: 'Save posts as drafts to finish and publish later',
    updatedAt: new Date('2025-01-15'),
    keywords: ['drafts', 'save', 'later', 'unfinished'],
    content: `
## Saving a Draft

When creating a post, click **Save as Draft** instead of posting. Your content, platforms, and media will be saved.

## Finding Your Drafts

Go to **Posts** > **Drafts** to see all saved drafts.

## Working with Drafts

### Edit a Draft
Click on any draft to open it in the editor. Make your changes and either:
- Save again as draft
- Post now
- Schedule for later

### Delete a Draft
Click the trash icon to permanently delete a draft.

### Search Drafts
Use the search bar to find drafts by content or title.

## Draft Storage

- Drafts are saved to your account, not your browser
- Access your drafts from any device
- Drafts include all media attachments
- No limit on number of drafts
    `.trim()
  },
  {
    id: 'using-calendar',
    slug: 'using-calendar',
    category: 'posting-scheduling',
    title: 'How to Use the Calendar',
    description: 'View and manage your content calendar',
    updatedAt: new Date('2025-01-15'),
    keywords: ['calendar', 'view', 'schedule', 'overview', 'plan'],
    content: `
## The Calendar View

Go to **Calendar** in the sidebar to see your content calendar.

## Calendar Features

### View Modes
- **Month**: See the full month overview
- **Week**: Focus on the current week
- **Day**: Detailed view of a single day

### Color Coding
Posts are color-coded by platform:
- Blue: Facebook
- Pink: Instagram
- Black: Twitter/X
- Purple: Threads
- Red: Pinterest
- Sky Blue: Bluesky
- Cyan: TikTok

### Quick Actions
- **Click a post**: View details and edit
- **Drag posts**: Reschedule by dragging to a new time

## Filtering

Use the platform filter to show/hide specific platforms on the calendar.

## Tips for Content Planning

1. **Maintain consistency**: Aim for regular posting times
2. **Mix content types**: Vary between promotional, educational, and engaging content
3. **Plan ahead**: Schedule content at least a week in advance
4. **Leave gaps**: Don't overwhelm your audience with too many posts
    `.trim()
  },
  {
    id: 'media-formats',
    slug: 'media-formats',
    category: 'posting-scheduling',
    title: 'Supported Media Formats',
    description: 'Learn about supported image and video formats for each platform',
    updatedAt: new Date('2025-01-15'),
    keywords: ['media', 'image', 'video', 'format', 'size', 'upload'],
    content: `
## Supported Formats

### Images
- **JPG/JPEG**: Recommended for photos
- **PNG**: Best for graphics with transparency
- **GIF**: Animated images (some platforms)
- **WebP**: Modern format, good compression

### Videos
- **MP4**: Universally supported
- **WebM**: Web-optimized format
- **MOV**: Apple format (converted automatically)

## Platform-Specific Requirements

### Instagram
- **Images**: Square (1:1), Portrait (4:5), Landscape (1.91:1)
- **Videos**: 3-60 seconds, up to 4GB
- **Stories**: 9:16 aspect ratio

### TikTok
- **Videos only**: No image posts
- **Aspect ratio**: 9:16 (vertical)
- **Duration**: 3 seconds to 10 minutes

### Pinterest
- **Images required**: Video pins also available
- **Best size**: 1000x1500 pixels (2:3)
- **Max size**: 20MB

### Facebook & Others
- Most formats supported
- Automatic optimization applied

## File Size Limits

- **Images**: Up to 20MB
- **Videos**: Up to 500MB

## Tips

1. **Use high resolution**: At least 1080px wide
2. **Optimize before upload**: Compress large files
3. **Check aspect ratios**: Match platform requirements
4. **Test on mobile**: Most users view on phones
    `.trim()
  },
  {
    id: 'character-limits',
    slug: 'character-limits',
    category: 'posting-scheduling',
    title: 'Character Limits by Platform',
    description: 'Quick reference for character limits on each social platform',
    updatedAt: new Date('2025-01-15'),
    keywords: ['character', 'limit', 'length', 'count', 'text'],
    content: `
## Character Limits Quick Reference

| Platform | Character Limit |
|----------|----------------|
| Twitter/X | 280 |
| Bluesky | 300 |
| Threads | 500 |
| TikTok | 2,200 |
| Instagram | 2,200 |
| LinkedIn | 3,000 |
| Facebook | 63,206 |
| Pinterest | 500 |

## Tips for Writing

### Short-Form (Twitter, Bluesky)
- Get to the point quickly
- Use line breaks for readability
- Save space with abbreviations
- Thread longer content

### Medium-Form (Threads, Instagram)
- Add context and personality
- Use emojis strategically
- Include call-to-action
- Hashtags at the end

### Long-Form (Facebook, LinkedIn)
- Tell a story
- Use formatting (line breaks, emojis)
- Include links and media
- Ask questions for engagement

## Real-Time Counter

The SocialCal editor shows live character counts for each selected platform. Red indicates you've exceeded the limit.
    `.trim()
  },

  // ============================================
  // ANALYTICS
  // ============================================
  {
    id: 'analytics-overview',
    slug: 'analytics-overview',
    category: 'analytics',
    title: 'Analytics Overview',
    description: 'Understanding your social media performance metrics',
    updatedAt: new Date('2025-01-15'),
    keywords: ['analytics', 'metrics', 'performance', 'stats', 'data'],
    content: `
## Analytics Dashboard

Go to **Analytics** in the sidebar to view your performance metrics across all connected platforms.

## Time Range Selection

You can view your analytics for different time periods:
- **Last 7 days**: Recent performance snapshot
- **Last 30 days**: Monthly overview
- **Last 90 days**: Quarterly trends

Use the date range selector at the top of the dashboard to switch between views.

## Overview Metrics

The main dashboard shows aggregated metrics across all your platforms:
- **Total Reach/Views**: How many people saw your content
- **Total Engagement**: Likes, comments, shares combined
- **Posts Published**: Number of posts in the selected period
- **Top Performing Posts**: Your best content

## Platform-Specific Analytics

Switch between platform tabs to see detailed analytics for each connected account. Platform-specific data is available for the **last 30 days**.

## Currently Supported Platforms

Analytics are available for:
- Instagram
- Facebook
- TikTok
- Pinterest
- Threads
- Bluesky

**Note**: Analytics for LinkedIn and X (Twitter) are not currently available due to API limitations.

## Latest Posts Performance

Each platform tab shows your recent posts with their individual performance metrics, so you can see what content resonates with your audience.
    `.trim()
  },
  {
    id: 'analytics-metrics',
    slug: 'analytics-metrics',
    category: 'analytics',
    title: 'Understanding Metrics',
    description: 'Learn what each metric means and how platforms differ',
    updatedAt: new Date('2025-01-15'),
    keywords: ['metrics', 'reach', 'views', 'impressions', 'engagement'],
    content: `
## Why Metrics Vary by Platform

Different social media platforms use different terminology for similar metrics. To provide a unified view, SocialCal groups related metrics together.

## Reach / Views

This metric represents how many people saw your content. Different platforms call it different things:

- **Instagram**: Reach (unique accounts)
- **Facebook**: Reach (unique users)
- **TikTok**: Views (video plays)
- **Pinterest**: Impressions
- **Threads**: Views
- **Bluesky**: Views

We combine all these under **Reach/Views** in your dashboard.

## Engagement

Engagement includes all interactions with your content:

- **Likes**: Hearts, thumbs up, reactions
- **Comments**: Replies and responses
- **Shares**: Reposts, retweets, saves
- **Clicks**: Link clicks, profile visits

## Platform-Specific Metrics

Some metrics are unique to certain platforms:

### Instagram
- Saves, Story views, Reel plays

### TikTok
- Watch time, Completion rate, Shares

### Pinterest
- Pin saves, Outbound clicks

### Facebook
- Reactions (like, love, etc.), Page views

## Tips for Using Analytics

1. **Compare similar content**: See what types of posts perform best
2. **Track trends over time**: Use 30-day or 90-day views
3. **Focus on engagement rate**: More meaningful than raw numbers
4. **Check platform-specific insights**: Each platform has unique valuable data
    `.trim()
  },

  // ============================================
  // BILLING & SUBSCRIPTION
  // ============================================
  {
    id: 'plans-pricing',
    slug: 'plans-pricing',
    category: 'billing-subscription',
    title: 'Available Plans and Pricing',
    description: 'Compare SocialCal plans and features',
    updatedAt: new Date('2025-01-15'),
    keywords: ['plans', 'pricing', 'cost', 'subscription', 'features', 'tier'],
    content: `
## SocialCal Plans

### Starter Plan
- **Price**: $9/month or $90/year
- 5 connected accounts
- **Unlimited posts**
- Full analytics
- 50 AI suggestions/month
- Priority support

### Professional Plan
- **Price**: $19/month or $190/year
- 15 connected accounts
- **Unlimited posts**
- Full analytics
- 150 AI suggestions/month
- Priority support

### Enterprise Plan
- **Price**: $29/month or $290/year
- Unlimited connected accounts
- **Unlimited posts**
- Full analytics
- 300 AI suggestions/month
- Dedicated support
- Team collaboration

## Annual Discount

Save ~17% by choosing annual billing. For example:
- Starter: $90/year instead of $108/year
- Professional: $190/year instead of $228/year

## Free Trial

All plans include a **7-day free trial**. No credit card required to start.
    `.trim()
  },
  {
    id: 'upgrade-plan',
    slug: 'upgrade-plan',
    category: 'billing-subscription',
    title: 'How to Upgrade Your Plan',
    description: 'Upgrade to unlock more features and higher limits',
    updatedAt: new Date('2025-01-15'),
    keywords: ['upgrade', 'plan', 'subscription', 'change', 'billing'],
    content: `
## Upgrading Your Plan

1. Go to **Settings** > **Billing** (or click your profile > **Subscription**)
2. Click **Upgrade Plan** or **Change Plan**
3. Select your desired plan
4. Choose monthly or annual billing
5. Enter payment details
6. Click **Subscribe**

## What Happens When You Upgrade

- **Immediate access**: New features unlock instantly
- **Prorated billing**: You only pay the difference for the current period
- **Keep your data**: All posts, drafts, and settings remain

## Payment Methods

We accept:
- Credit cards (Visa, Mastercard, Amex)
- Debit cards
- Some regions support local payment methods

## Changing Billing Frequency

To switch between monthly and annual:
1. Go to **Billing** settings
2. Click **Manage Subscription**
3. Select your preferred billing frequency
4. Confirm the change

Changes take effect at the next billing cycle.
    `.trim()
  },
  {
    id: 'cancel-subscription',
    slug: 'cancel-subscription',
    category: 'billing-subscription',
    title: 'How to Cancel Your Subscription',
    description: 'Cancel your subscription and understand what happens next',
    updatedAt: new Date('2025-01-15'),
    keywords: ['cancel', 'subscription', 'stop', 'end', 'refund'],
    content: `
## Canceling Your Subscription

1. Go to **Settings** > **Billing**
2. Click **Manage Subscription**
3. Click **Cancel Subscription**
4. Confirm your cancellation

## What Happens After Cancellation

- **Access continues**: You keep paid features until the end of your billing period
- **Then downgrade**: After the period ends, you move to the Free plan
- **Data preserved**: Your posts, drafts, and connected accounts remain
- **Limits apply**: Free plan limits will apply to new posts

## Money-Back Guarantee

We offer a **14-day money-back guarantee** on all paid plans. If you're not satisfied within the first 14 days of your subscription, contact us for a full refund.

## Reactivating Your Subscription

Changed your mind? Simply:
1. Go to **Billing** settings
2. Click **Reactivate** or choose a new plan
3. Your data and settings will still be there

## Before You Go

We'd love to know why you're leaving. Your feedback helps us improve SocialCal for everyone.
    `.trim()
  },
  {
    id: 'usage-limits',
    slug: 'usage-limits',
    category: 'billing-subscription',
    title: 'Understanding Usage Limits',
    description: 'Learn about connected accounts and AI suggestions limits',
    updatedAt: new Date('2025-01-15'),
    keywords: ['limits', 'usage', 'quota', 'posts', 'accounts', 'ai'],
    content: `
## Usage Limits by Plan

### Connected Accounts
How many social media accounts you can connect:
- **Starter**: 5 accounts
- **Professional**: 15 accounts
- **Enterprise**: Unlimited

### Scheduled Posts
All plans include **unlimited scheduled posts**.

### AI Caption Suggestions
AI-generated captions per month:
- **Starter**: 50 suggestions/month
- **Professional**: 150 suggestions/month
- **Enterprise**: 300 suggestions/month

## Checking Your Usage

1. Go to **Dashboard** - see usage overview
2. Or go to **Billing** - see detailed usage stats

## What Happens at the Limit?

- **Connected accounts**: Can't add more until you upgrade or disconnect one
- **AI suggestions**: Wait until next month or upgrade to a higher plan

## All Plans Include

All SocialCal plans include:
- **Unlimited posts** - schedule and publish as much as you want
- **Unlimited drafts** - save as many drafts as you need
- **Full analytics** - access all your performance data
    `.trim()
  },
]

// Helper functions
export function getArticlesByCategory(category: FAQCategory): FAQArticle[] {
  return faqArticles.filter(article => article.category === category)
}

export function getArticleBySlug(slug: string): FAQArticle | undefined {
  return faqArticles.find(article => article.slug === slug)
}

export function searchArticles(query: string): FAQArticle[] {
  const lowerQuery = query.toLowerCase()
  return faqArticles.filter(article =>
    article.title.toLowerCase().includes(lowerQuery) ||
    article.description.toLowerCase().includes(lowerQuery) ||
    article.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery)) ||
    article.content.toLowerCase().includes(lowerQuery)
  )
}

export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

// Generate table of contents from markdown content
export function generateToc(content: string): TocItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const toc: TocItem[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const title = match[2]
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    toc.push({ id, title, level })
  }

  return toc
}

// Get all article content as context for AI
export function getAllArticlesAsContext(): string {
  return faqArticles.map(article =>
    `## ${article.title}\n${article.content}`
  ).join('\n\n---\n\n')
}
