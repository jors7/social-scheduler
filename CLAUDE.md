# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SocialCal is a web application that allows users to schedule and post content across major social media platforms with one click. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives with custom styling
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)

## Development Commands

```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
/
├── app/                 # Next.js app directory
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Landing page
│   ├── login/          # Login page
│   ├── signup/         # Signup page
│   └── dashboard/      # Dashboard (to be implemented)
├── components/         
│   ├── ui/             # Reusable UI components
│   ├── landing/        # Landing page components
│   └── dashboard/      # Dashboard components
├── lib/                # Utility functions
│   └── supabase/       # Supabase client configuration
├── supabase/           # Database schema and migrations
└── public/             # Static assets
```

## Key Features to Implement

1. **Multi-platform posting**: X, Instagram, Facebook, LinkedIn, YouTube, TikTok, Threads, Bluesky, Pinterest
2. **Post scheduling**: Calendar view with drag-and-drop
3. **AI caption suggestions**: Integration with AI service for caption generation
4. **Analytics dashboard**: Basic analytics for post performance
5. **Team collaboration**: Multiple users with roles and permissions

## Component Architecture

- Use Server Components by default for better performance
- Client Components only when needed (forms, interactivity)
- Shared UI components in `/components/ui`
- Feature-specific components in feature folders

## Current Implementation Status

### Core Infrastructure ✅
- ✅ Project initialized with Next.js 14 and TypeScript
- ✅ Basic UI components (Button, Card, Input, Label, RichTextEditor)
- ✅ Landing page with all sections
- ✅ Login and Signup pages with Supabase Auth
- ✅ Dashboard layout with sidebar navigation
- ✅ Authentication system (Supabase Auth with RLS)
- ✅ Database setup (Supabase PostgreSQL)

### Social Media Integration ✅
- ✅ **Twitter/X**: OAuth 1.0a with PIN-based authentication (read-only due to API limitations)
- ✅ **Bluesky**: AT Protocol integration with full posting capabilities
- ✅ **Facebook**: Meta OAuth 2.0 with page posting capabilities
- ✅ **Instagram**: Meta OAuth 2.0 (pending app review for posting)
- ✅ **Threads**: Meta OAuth 2.0 (pending app review for posting)
- ✅ **Pinterest**: OAuth 2.0 setup (pending app review for posting)
- ✅ Social account management in settings with connect/disconnect functionality
- ✅ Platform-specific credential storage with encryption

### Content Creation & Posting ✅
- ✅ **Rich Text Editor**: TipTap-based editor with formatting, links, hashtags, mentions
- ✅ **Multi-Platform Posting**: Simultaneous posting to Facebook and Bluesky
- ✅ **Platform-Specific Content**: Custom content per platform with character limits
- ✅ **Media Upload**: Image/video upload to Supabase Storage with automatic cleanup
- ✅ **Content Validation**: Platform-specific character limits and content filtering
- ✅ **HTML Content Cleaning**: Proper paragraph preservation and entity handling

### AI Features ✅
- ✅ **AI Caption Suggestions**: OpenAI GPT-4o-mini integration
- ✅ **Multiple Tones**: Professional, Casual, Funny, Inspirational options
- ✅ **Smart Hashtags**: AI-generated relevant hashtags
- ✅ **Platform Optimization**: AI suggestions tailored to selected platforms

### Scheduling System ✅
- ✅ **Database Schema**: `scheduled_posts` table with JSONB fields and RLS
- ✅ **Scheduling UI**: Date/time picker with validation
- ✅ **Background Processing**: Cron job API endpoint for automated posting
- ✅ **Status Management**: Pending, posting, posted, failed, cancelled states
- ✅ **Manual Controls**: Post Now, Pause, Resume functionality
- ✅ **Media Handling**: Scheduled posts with images
- ✅ **Error Handling**: Robust error logging and status updates
- ✅ **Timezone Support**: 5-minute tolerance for scheduling validation

### Drafts System ✅
- ✅ **Database Schema**: `drafts` table with full content preservation
- ✅ **CRUD Operations**: Create, Read, Update, Delete draft functionality
- ✅ **Smart Loading**: Load drafts into editor with proper content restoration
- ✅ **Media Preservation**: Draft images persist and display correctly
- ✅ **Auto-Publish**: "Publish Now" from drafts works seamlessly
- ✅ **Auto-Schedule**: "Schedule" from drafts pre-fills scheduling form
- ✅ **Draft Cleanup**: Automatic deletion after successful posting/scheduling
- ✅ **Search & Sort**: Draft management with search, filtering, and sorting
- ✅ **Metadata Display**: Word count, creation time, platform indicators

### Analytics Dashboard ✅
- ✅ Basic analytics dashboard with charts and metrics
- ✅ Performance tracking visualization
- ✅ Chart.js integration for data visualization

### Development & Deployment ✅
- ✅ **Error Handling**: Comprehensive error logging and user feedback
- ✅ **TypeScript**: Full type safety throughout the application
- ✅ **Build Optimization**: Vercel deployment with proper bundling
- ✅ **Environment Variables**: Secure credential management
- ✅ **Database Migrations**: SQL scripts for table creation and policies

### Known Limitations & Workarounds
- 🔄 **Twitter**: Read-only API access (posting disabled due to API costs)
- 🔄 **Meta Platforms**: Pending app review for Instagram/Threads posting
- 🔄 **Vercel Cron**: Hobby plan limited to hourly scheduling (not minute-level)
- 🔄 **Manual Triggers**: Added "Post Now" buttons for immediate posting

## 🚨 CRITICAL ISSUES TO FIX

### Identified Problems
1. **Stripe Integration Not Working**: Payments aren't being processed due to webhook configuration
2. **No Authentication UI**: Missing login/logout functionality in the sidebar
3. **No Profile/Billing Pages**: These pages don't exist but are linked in the sidebar
4. **Subscription Not Updating**: After payment, subscription status isn't updating in database
5. **Environment Variable Conflict**: NEXT_PUBLIC_APP_URL defined twice with different values

## 📋 IMPLEMENTATION PLAN

### Phase 1: Fix Critical Configuration Issues ⚙️
- [x] Fix environment variables (remove duplicate NEXT_PUBLIC_APP_URL)
- [x] Configure Stripe webhook endpoint for local development
- [x] Fix subscription service to use service role for webhooks

### Phase 2: Implement Authentication UI 🔐
- [x] Create `/api/auth/logout` endpoint
- [x] Add working logout button in sidebar
- [x] Show user info in sidebar (email/name)
- [x] Create user profile page (`/dashboard/profile`)
- [x] Add email verification handling

### Phase 3: Implement Billing & Subscription Management 💳
- [ ] Create billing page (`/dashboard/billing`)
  - [ ] Show current subscription details
  - [ ] Display payment history
  - [ ] Add Stripe Customer Portal link
  - [ ] Show usage statistics
- [ ] Fix webhook handler with service role
- [ ] Create client-side subscription utilities
- [ ] Handle subscription events properly

### Phase 4: Fix Subscription Gate & Status Updates 🔒
- [ ] Fix SubscriptionGate component subscription checking
- [ ] Add subscription status refresh after payment
- [ ] Handle trial periods correctly
- [ ] Update UI immediately after successful payment

### Phase 5: Testing & Verification 🧪
- [ ] Set up Stripe CLI for local testing
- [ ] Test complete signup → payment → access flow
- [ ] Test subscription cancellation
- [ ] Test trial expiration

### Phase 6: Additional Features ✨
- [ ] Add Stripe Customer Portal integration
- [ ] Add usage tracking dashboard
- [ ] Implement subscription upgrade/downgrade flow

## 🛠️ STEP-BY-STEP IMPLEMENTATION

### Step 1: Fix Environment Variables
```bash
# Remove duplicate NEXT_PUBLIC_APP_URL
# Keep only: NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Step 2: Set Up Stripe CLI
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Copy the webhook signing secret and update .env.local
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Step 3: Create Missing Pages
- `/app/dashboard/profile/page.tsx` - User profile management
- `/app/dashboard/billing/page.tsx` - Subscription & billing
- `/app/api/auth/logout/route.ts` - Logout endpoint
- `/app/api/stripe/portal/route.ts` - Customer portal

### Step 4: Fix Webhook Handler
- Use Supabase service role for database updates
- Handle all subscription lifecycle events
- Update user subscription status correctly

### Step 5: Test Payment Flow
1. Sign up new user
2. Try to access locked feature
3. Click "Subscribe Now"
4. Complete Stripe checkout
5. Verify subscription is active
6. Verify access to locked features

## 📝 FILES TO CREATE/MODIFY

### New Files Required:
- `/app/dashboard/profile/page.tsx`
- `/app/dashboard/billing/page.tsx`
- `/app/api/auth/logout/route.ts`
- `/app/api/stripe/portal/route.ts`
- `/lib/subscription/client.ts`

### Files to Modify:
- `.env.local` - Fix environment variables
- `/components/dashboard/sidebar.tsx` - Add logout, user info
- `/app/api/webhooks/stripe/route.ts` - Fix with service role
- `/lib/subscription/service.ts` - Split server/client
- `/components/subscription/subscription-gate.tsx` - Fix checking

## ✅ SUCCESS CRITERIA
- [ ] User can sign up and log in
- [ ] User can log out from dashboard
- [ ] User can view their profile
- [ ] User can subscribe via Stripe
- [ ] Subscription unlocks features immediately
- [ ] User can manage billing via Stripe portal
- [ ] Webhooks update subscription status
- [ ] Trial periods work correctly

### Pending Features (After Core Fix)
- ⏳ **Edit Scheduled Posts**: Modify scheduled content before posting
- ⏳ **Advanced Analytics**: Detailed performance metrics and insights
- ⏳ **Team Collaboration**: Multi-user support with roles and permissions
- ⏳ **Production Deployment**: Custom domain and app store reviews

## Platform API Requirements & Scopes

### TikTok API v2 Scopes

#### Currently Implemented (Phase 1)
```
user.info.basic,video.publish,video.upload
```
- ✅ **user.info.basic**: Basic profile information (name, avatar)
- ✅ **video.publish**: Publish videos to user's profile
- ✅ **video.upload**: Upload video content via PULL_FROM_URL

#### Future Scopes for Analytics (Phase 2 - After App Approval)
```
user.info.profile,user.info.stats,video.list
```
- 📊 **user.info.profile**: Bio, verification status, profile links
- 📊 **user.info.stats**: Follower/following counts, likes, video count
- 📊 **video.list**: List user's videos for performance tracking

**Important**: Do NOT add Phase 2 scopes until TikTok approves them. Adding unapproved scopes will break authentication.

### Pinterest API Scopes
```
boards:read,boards:write,pins:read,pins:write,user_accounts:read
```
- ✅ All scopes requested, pending app review for production access
- 🔄 Currently limited to sandbox mode

### Meta Platforms (Facebook, Instagram, Threads)
- Various platform-specific permissions handled through Meta Graph API
- Threads requires special app review for posting capabilities

## Technical Implementation Details

### Database Schema
```sql
-- Scheduled Posts Table
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  platforms JSONB NOT NULL,
  platform_content JSONB,
  media_urls JSONB,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending'
);

-- Drafts Table  
CREATE TABLE drafts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  content TEXT NOT NULL,
  platforms JSONB NOT NULL,
  platform_content JSONB,
  media_urls JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Accounts Table
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  platform TEXT NOT NULL,
  platform_user_id TEXT,
  username TEXT,
  access_token TEXT,
  access_secret TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
);
```

### API Integrations

#### Facebook/Instagram/Threads (Meta)
- **OAuth 2.0** flow with Meta Graph API
- **App Review Required** for production posting
- **Page Access Tokens** for Facebook pages
- **Media Upload** via Graph API endpoints
- **Webhook Integration** for real-time updates

#### Bluesky (AT Protocol)
- **Direct API Integration** with @atproto/api
- **Full Posting Capabilities** including images
- **Credential Storage** (identifier + password)
- **Rich Text Support** with link detection

#### Twitter/X
- **OAuth 1.0a** with PIN-based authentication
- **Read-Only Access** due to API pricing
- **PIN Flow Workaround** for callback limitations

### Key Services

#### Posting Service (`/lib/posting/service.ts`)
- **Multi-platform abstraction** layer
- **HTML content cleaning** with paragraph preservation
- **Media handling** with automatic cleanup
- **Error handling** and retry logic
- **Platform-specific formatting**

#### Rich Text Editor (`/components/ui/rich-text-editor.tsx`)
- **TipTap** editor with extensions
- **Character counting** per platform
- **Link handling** with validation
- **Content synchronization** between editor and React state

#### Background Processing (`/app/api/cron/process-scheduled-posts/route.ts`)
- **Scheduled post processing** every hour
- **Direct function calls** (not HTTP) for Vercel compatibility
- **Status tracking** and error handling
- **Media cleanup** after posting

### Security & Performance
- **Row Level Security** on all database tables
- **Environment variable** encryption
- **Media cleanup** to prevent storage bloat
- **Type safety** throughout with TypeScript
- **Error boundaries** and user feedback
- **Optimistic UI updates** for better UX

### Development Workflow
1. **Local Development**: `npm run dev` on port 3001
2. **Database Changes**: Run SQL scripts in Supabase SQL Editor  
3. **Environment Setup**: Configure `.env.local` with API keys
4. **Testing**: Manual testing with Facebook and Bluesky (only working platforms)
5. **Deployment**: Automatic Vercel deployment on git push

## Recent Updates - Billing & Subscription System (Jan 2025)

### ✅ Successfully Implemented
1. **Complete Stripe Integration**
   - Checkout flow with 7-day trials
   - Three pricing tiers: Starter ($9/90), Professional ($19/190), Enterprise ($29/290)
   - Stripe webhook handling for real-time updates
   - Customer portal for subscription management

2. **User Authentication & Profile**
   - Fixed dashboard data loading issues
   - Added logout functionality
   - Profile management with persistent updates
   - User avatar display in sidebar

3. **Billing Dashboard**
   - Comprehensive billing page at `/dashboard/billing`
   - Current plan display with status
   - Usage statistics with progress bars
   - Payment history tracking
   - Quick upgrade/manage options

4. **Subscription Gates**
   - Feature locking for premium features
   - Automatic unlock after payment
   - Trial period support
   - Clear upgrade prompts

### Database Additions
```sql
-- Payment History Table
CREATE TABLE payment_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  amount INTEGER,
  currency TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);

-- Usage Summary Function
CREATE FUNCTION get_usage_summary(user_uuid UUID)
RETURNS TABLE (
  posts_used INTEGER,
  posts_limit INTEGER,
  ai_suggestions_used INTEGER,
  ai_suggestions_limit INTEGER,
  connected_accounts_used INTEGER,
  connected_accounts_limit INTEGER
);
```

### Key Files for Billing System
- `/app/dashboard/billing/page.tsx` - Billing dashboard
- `/app/api/stripe/portal/route.ts` - Customer portal endpoint
- `/app/api/stripe/checkout/route.ts` - Checkout session creation
- `/app/api/webhooks/stripe/route.ts` - Webhook handler
- `/lib/subscription/client.ts` - Client-side subscription utilities
- `/components/subscription/subscription-gate.tsx` - Feature locking