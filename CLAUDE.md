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
- **Authentication**: TBD (NextAuth.js planned)
- **Database**: TBD (PostgreSQL/Prisma planned)

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

- ✅ Project initialized with Next.js and TypeScript
- ✅ Basic UI components (Button, Card, Input, Label)
- ✅ Landing page with all sections
- ✅ Login and Signup pages (UI only)
- ✅ Dashboard layout with sidebar navigation
- ✅ Dashboard home page with stats and quick actions
- ✅ Post creation interface with platform selection
- ✅ Calendar view for scheduled posts
- ✅ Posts management page (All/Scheduled/Posted/Drafts)
- ✅ Settings page with social media account connections
- ⏳ Authentication system (NextAuth.js)
- ⏳ Database setup (PostgreSQL/Prisma)
- ⏳ API integrations for social platforms
- ⏳ Rich text editor for post content
- ⏳ AI caption suggestions
- ⏳ Analytics dashboard
- ⏳ Billing integration