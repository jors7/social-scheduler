# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Social Scheduler is a web application that allows users to schedule and post content across major social media platforms with one click. Built with Next.js 14, TypeScript, and Tailwind CSS.

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

### Pending Features
- ⏳ **Edit Scheduled Posts**: Modify scheduled content before posting
- ⏳ **Advanced Analytics**: Detailed performance metrics and insights
- ⏳ **Team Collaboration**: Multi-user support with roles and permissions
- ⏳ **Billing Integration**: Subscription management and usage tracking
- ⏳ **Production Deployment**: Custom domain and app store reviews

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