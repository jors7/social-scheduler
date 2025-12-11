# SocialCal UI/UX Test Checklist

## Overview

This document provides comprehensive UI/UX test checklists for all major user-facing pages across different device sizes, plus step-by-step first-time user test scenarios for screen recording.

---

## Device Breakpoints Reference

| Device Type | Width Range | Examples |
|------------|-------------|----------|
| Mobile | 320px - 480px | iPhone SE, older Android phones |
| Tablet | 481px - 768px | iPad Mini, smaller tablets |
| Small Laptop | 769px - 1024px | 13" laptops, iPad Pro |
| Desktop Large | 1025px+ | Desktop monitors, large laptops |

---

## Page-by-Page Test Checklists

### 1. Landing Page (/)

#### Desktop (Large + Small Laptop)

**Layout & Structure**
- [ ] No horizontal scroll at any viewport width
- [ ] Navbar is sticky and visible while scrolling
- [ ] Logo is visible and clickable (goes to home)
- [ ] Navigation links are horizontally aligned
- [ ] Hero section has proper spacing and alignment
- [ ] Dashboard preview image loads correctly
- [ ] All sections (Features, Impact, Testimonials, Pricing, How It Works) stack properly
- [ ] Footer links are organized in columns

**Core Actions Visible**
- [ ] "Start Free Trial" / "Get Started" CTA is prominent above the fold
- [ ] "Login" button visible in navbar
- [ ] Pricing section shows all 3 plans clearly
- [ ] Plan comparison is readable
- [ ] "Subscribe" buttons work for each plan

**Loading States**
- [ ] Initial page load shows skeleton/placeholder for lazy-loaded sections
- [ ] Auth modal shows loading spinner when signing in
- [ ] Platform icons in hero animate on load

**Error States**
- [ ] Auth modal shows error messages for invalid credentials
- [ ] OAuth errors display meaningful feedback
- [ ] Network error shows retry option

#### Tablet

- [ ] Navbar collapses to hamburger menu below 768px
- [ ] Hero content is centered and readable
- [ ] Feature cards stack in 2-column grid
- [ ] Pricing cards stack vertically or 2-up
- [ ] Platform icons wrap properly
- [ ] Images resize responsively

#### Mobile

- [ ] Hamburger menu is visible and functional
- [ ] Mobile menu slides in/out smoothly
- [ ] Hero text is readable (no text overflow)
- [ ] CTA buttons span full width
- [ ] Pricing cards stack vertically
- [ ] Footer collapses to single column
- [ ] No horizontal overflow
- [ ] Touch targets are at least 44x44px

---

### 2. Signup/Login Modal

#### Desktop

- [ ] Modal centers on screen with backdrop
- [ ] Close button (X) is visible and functional
- [ ] Tab switching between Sign In / Sign Up works
- [ ] Form fields have proper labels
- [ ] Password visibility toggle works
- [ ] OAuth buttons (Google, etc.) are visible
- [ ] "Forgot Password" link is present

**Validation**
- [ ] Email validation shows error for invalid format
- [ ] Password minimum requirements displayed
- [ ] Error messages appear inline below fields
- [ ] Success redirects to dashboard

#### Tablet & Mobile

- [ ] Modal is nearly full-screen on mobile
- [ ] Form is scrollable if keyboard opens
- [ ] Touch keyboard doesn't hide submit button
- [ ] OAuth buttons stack vertically

---

### 3. Dashboard Home (/dashboard)

#### Desktop (Large + Small Laptop)

**Layout**
- [ ] Sidebar is visible and fixed on left
- [ ] Main content area has proper max-width
- [ ] Greeting shows correct time of day
- [ ] Usage stats cards display in grid (3-4 columns)
- [ ] Activity overview section shows recent/scheduled/drafts tabs
- [ ] Quick actions (Create Post, View Calendar) are prominent

**Core Actions**
- [ ] "Create Post" button is above the fold
- [ ] Navigation to all sections via sidebar works
- [ ] Usage limits show progress bars
- [ ] "Upgrade" prompts appear when at limits

**Empty States**
- [ ] New user sees helpful onboarding wizard option
- [ ] "No recent posts" message explains what to do
- [ ] Empty scheduled posts shows "Schedule your first post" CTA
- [ ] Empty drafts shows "Start writing" CTA

**Loading States**
- [ ] Skeleton loaders appear for each card section
- [ ] Analytics data shows "Loading..." with spinner
- [ ] Platform icons pulse during data fetch

#### Tablet

- [ ] Sidebar collapses to icons-only or hamburger
- [ ] Usage cards stack to 2-column
- [ ] Activity tabs remain horizontal

#### Mobile

- [ ] Sidebar becomes bottom nav or hamburger menu
- [ ] Usage cards stack vertically
- [ ] Greeting text doesn't overflow
- [ ] Quick action buttons are full-width
- [ ] Pull-to-refresh works (if implemented)

---

### 4. Create/Edit Post (/dashboard/create/new)

#### Desktop

**Layout**
- [ ] Rich text editor takes up primary space
- [ ] Platform selector sidebar is visible
- [ ] Media upload area is accessible
- [ ] Character counters show per-platform limits
- [ ] AI suggestion panel is accessible

**Core Actions**
- [ ] Select/deselect platforms with checkboxes
- [ ] Type in rich text editor with formatting
- [ ] Upload image/video via drag-drop or click
- [ ] Generate AI caption with tone selector
- [ ] Preview post per platform
- [ ] Schedule with date/time picker
- [ ] "Post Now" and "Schedule" buttons prominent
- [ ] "Save Draft" option visible

**Empty States**
- [ ] Blank editor shows placeholder text
- [ ] No platforms selected shows "Select at least one platform"
- [ ] No media shows upload zone with instructions

**Error States**
- [ ] Character limit exceeded highlights in red
- [ ] Failed upload shows error with retry
- [ ] Platform API errors display specific message
- [ ] Unsaved changes prompt on navigation away

**Loading States**
- [ ] AI suggestion shows generating animation
- [ ] Image upload shows progress indicator
- [ ] "Posting..." state disables submit button

#### Tablet

- [ ] Editor and platform selector stack vertically
- [ ] Media preview is appropriately sized
- [ ] Date picker modal is usable

#### Mobile

- [ ] Full-screen editing experience
- [ ] Platform selector is a modal/dropdown
- [ ] Image upload from camera roll works
- [ ] Keyboard doesn't hide important controls
- [ ] Action buttons sticky at bottom

---

### 5. Calendar (/dashboard/calendar)

#### Desktop

**Layout**
- [ ] Month view shows full calendar grid
- [ ] Posts appear on scheduled dates
- [ ] Legend for post status colors visible
- [ ] Filter bar (search, status, platform) above calendar

**Core Actions**
- [ ] Navigate between months
- [ ] Click on date to see posts for that day
- [ ] Drag and drop post to reschedule
- [ ] Click post to edit
- [ ] Bulk select posts
- [ ] Delete selected posts

**Empty States**
- [ ] Empty calendar shows "No scheduled posts" with CTA
- [ ] Filter with no results shows "No posts match filters"

**Loading States**
- [ ] Calendar skeleton while fetching posts
- [ ] Drag-drop shows ghost element

#### Tablet

- [ ] Calendar remains usable but may need horizontal scroll for all days
- [ ] Post cards in day cells are smaller

#### Mobile

- [ ] Consider agenda/list view instead of month grid
- [ ] Week view might be better default
- [ ] Touch-friendly drag handles
- [ ] Post details in bottom sheet on tap

---

### 6. Scheduled Posts (/dashboard/posts/scheduled)

#### Desktop

**Layout**
- [ ] List/grid of scheduled posts
- [ ] Each post shows: content preview, platforms, scheduled time, status
- [ ] Search and filter bar at top
- [ ] Pagination at bottom

**Core Actions**
- [ ] Search posts by content
- [ ] Filter by platform, status, time range
- [ ] "Post Now" button per post
- [ ] "Pause" / "Resume" toggle
- [ ] Edit post (navigates to editor)
- [ ] Delete post (with confirmation)
- [ ] Bulk select and delete

**Empty States**
- [ ] No posts: "No scheduled posts yet. Create your first post!"
- [ ] Filter no results: "No posts match your filters"

**Loading States**
- [ ] Post cards show skeleton
- [ ] Action buttons show spinner when processing

**Error States**
- [ ] Failed to fetch shows retry button
- [ ] Post action failed shows toast error

#### Tablet & Mobile

- [ ] Posts stack in single column on mobile
- [ ] Filter dropdowns become modals
- [ ] Swipe actions for quick post/pause/delete

---

### 7. Posted Posts (/dashboard/posts/posted)

Similar checklist to Scheduled Posts, plus:

- [ ] Performance metrics shown per post (likes, comments, shares)
- [ ] Platform-specific media URLs display correctly
- [ ] "View on [Platform]" links work
- [ ] Date filter includes past dates

---

### 8. Drafts (/dashboard/posts/drafts)

Similar checklist to Scheduled Posts, plus:

- [ ] "Continue Editing" action primary
- [ ] "Schedule" action secondary
- [ ] "Delete" with confirmation
- [ ] Last edited timestamp shown
- [ ] Word count visible

---

### 9. Analytics (/dashboard/analytics)

#### Desktop

**Layout**
- [ ] Overview cards (Total Posts, Engagement, Reach, Impressions) visible
- [ ] Date range selector works
- [ ] Charts render correctly (Engagement Over Time, Platform Breakdown)
- [ ] Top Posts section shows best performers
- [ ] Platform-specific tabs work

**Core Actions**
- [ ] Change date range (7/30/90 days)
- [ ] Refresh data manually
- [ ] Export to CSV
- [ ] Drill down into specific platform analytics

**Empty States**
- [ ] No data: Show preview/mock data with "Connect accounts to see real data"
- [ ] No posts in period: "No posts in selected date range"

**Loading States**
- [ ] Beautiful loading animation with platform icons
- [ ] Individual chart loading states
- [ ] "Loading analytics data..." message

**Error States**
- [ ] Platform API error: "Unable to fetch [Platform] data"
- [ ] General error with retry option

#### Tablet

- [ ] Charts resize responsively
- [ ] Overview cards 2-column

#### Mobile

- [ ] Single column layout
- [ ] Scrollable charts
- [ ] Simplified data tables

---

### 10. Settings (/dashboard/settings)

#### Desktop

**Layout**
- [ ] Settings navigation tabs/sidebar
- [ ] Sections: Account, Social Accounts, Billing Plans, Profile

**Social Accounts Section**
- [ ] List of all supported platforms
- [ ] Connected status indicator per platform
- [ ] "Connect" / "Disconnect" buttons
- [ ] Username/page name shown when connected

**Core Actions**
- [ ] Connect new social account (opens OAuth flow)
- [ ] Disconnect account (with confirmation)
- [ ] View connection status

**Empty States**
- [ ] No accounts connected: Prominent "Connect your first account" message

**Error States**
- [ ] OAuth failed: Clear error message with retry
- [ ] Token expired: "Reconnect required" indicator

**Loading States**
- [ ] Connection attempt shows spinner
- [ ] Account list skeleton on page load

#### Tablet & Mobile

- [ ] Single column layout
- [ ] Platform cards stack vertically

---

### 11. Billing (/dashboard/billing)

#### Desktop

**Layout**
- [ ] Current plan prominently displayed
- [ ] Usage stats with progress bars
- [ ] Plan features list
- [ ] Payment history table
- [ ] Upgrade/Change Plan button

**Core Actions**
- [ ] View current subscription details
- [ ] Change plan (opens modal)
- [ ] Manage subscription (opens Stripe portal)
- [ ] View/download invoices

**Empty States**
- [ ] No payment history: "No payments yet"
- [ ] Free plan: Shows upgrade CTA prominently

**Loading States**
- [ ] Billing data loading spinner
- [ ] Stripe portal redirect shows loading

**Error States**
- [ ] Payment failed alert
- [ ] Invoice load error

#### Tablet & Mobile

- [ ] Plan card full width
- [ ] Usage stats stack
- [ ] Payment history scrollable

---

### 12. Pricing (/pricing)

#### Desktop

- [ ] 3 plan cards side by side
- [ ] Monthly/Annual toggle works
- [ ] Feature comparison visible
- [ ] "Most Popular" badge on recommended plan
- [ ] CTA buttons for each plan

#### Tablet

- [ ] 2-column or stacked cards

#### Mobile

- [ ] Single column, swipeable cards optional
- [ ] Feature lists collapsible

---

## Cross-Cutting Concerns (All Pages)

### Accessibility

- [ ] All interactive elements are keyboard navigable
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Images have alt text
- [ ] Form labels associated with inputs
- [ ] Aria labels for icon-only buttons

### Performance

- [ ] Page loads in < 3 seconds on 3G
- [ ] Lazy loading for below-fold images
- [ ] No layout shift after load (CLS)

### Responsive

- [ ] Test at: 320px, 480px, 768px, 1024px, 1440px widths
- [ ] No horizontal overflow at any breakpoint
- [ ] Touch targets minimum 44x44px on mobile

---

## First-Time User Test Scenarios (Screen Recording)

### Scenario 1: New User Signs Up and Schedules First Post in <5 Minutes

**Goal:** Test the complete onboarding to first scheduled post flow

**Pre-requisites:**
- Fresh browser/incognito mode
- Stop timer when test starts

**Step-by-Step Script:**

1. **Navigate to Landing Page** (0:00)
   - Go to https://www.socialcal.app (or localhost:3000)
   - Observe: Does the page load quickly? Is the CTA visible?

2. **Click "Start Free Trial" or "Get Started"** (0:30)
   - Click the primary CTA button
   - Observe: Does signup modal appear smoothly?

3. **Complete Signup** (1:00)
   - Enter email and password
   - Click "Sign Up"
   - Observe: Loading indicator? Success redirect to dashboard?

4. **Dashboard First Impression** (1:30)
   - Note: What do you see first?
   - Is there an onboarding wizard or guidance?
   - Can you immediately see how to create a post?

5. **Connect First Social Account** (2:00)
   - Go to Settings > Social Accounts
   - Click "Connect" on Bluesky (or Facebook)
   - Complete OAuth flow
   - Observe: Clear instructions? Success confirmation?

6. **Create First Post** (3:00)
   - Click "Create Post" from dashboard or navigation
   - Select the connected platform
   - Type a sample post: "Testing my first post with SocialCal!"
   - Observe: Character counter? Platform preview?

7. **Use AI Caption (Optional)** (3:30)
   - Click "AI Suggestions"
   - Select a tone (e.g., "Professional")
   - Observe: Does suggestion appear? Quality?

8. **Schedule the Post** (4:00)
   - Click "Schedule"
   - Pick a date/time 1 hour from now
   - Confirm scheduling
   - Observe: Success message? Redirect to calendar or scheduled posts?

9. **Verify Scheduled Post** (4:30)
   - Navigate to Calendar or Scheduled Posts
   - Confirm the post appears
   - Observe: Correct date/time? Can edit if needed?

**Success Criteria:**
- [ ] Completed in under 5 minutes
- [ ] No blocking errors encountered
- [ ] User understood each step without external help
- [ ] Post successfully scheduled

---

### Scenario 2: User Connects 3 Platforms and Checks Analytics

**Goal:** Test multi-platform connection and analytics dashboard

**Pre-requisites:**
- User already signed up
- Test accounts ready for: Facebook, Instagram, Bluesky

**Step-by-Step Script:**

1. **Login to Dashboard** (0:00)
   - Login with existing account
   - Navigate to Settings > Social Accounts

2. **Connect Facebook** (0:30)
   - Click "Connect" on Facebook
   - Complete OAuth (login to Facebook if needed)
   - Select a Page to connect
   - Observe: Success message? Page name displayed?

3. **Connect Instagram** (1:30)
   - Click "Connect" on Instagram
   - Complete Meta OAuth flow
   - Observe: Success message? Username displayed?

4. **Connect Bluesky** (2:30)
   - Click "Connect" on Bluesky
   - Enter Bluesky identifier and app password
   - Observe: Different flow from OAuth - clear instructions?

5. **Verify All Connections** (3:30)
   - Confirm all 3 platforms show "Connected" status
   - Note any issues or confusing UI

6. **Navigate to Analytics** (4:00)
   - Click "Analytics" in sidebar
   - Observe initial load state

7. **Review Analytics Dashboard** (4:30)
   - Check Overview cards (posts, engagement, reach)
   - Note: Is there data or preview/mock data?
   - Change date range from 7 days to 30 days
   - Observe: Data updates? Loading state?

8. **Check Platform Breakdown** (5:30)
   - Review per-platform performance
   - Click on Platform Insights tabs
   - Observe: Individual platform data?

9. **Export Analytics** (6:00)
   - Click "Export" button
   - Download CSV
   - Open and verify data makes sense

**Success Criteria:**
- [ ] All 3 platforms connected without errors
- [ ] Analytics dashboard displays data (or clear empty state)
- [ ] Date range filter works
- [ ] Export produces valid CSV file

---

### Scenario 3: User Creates Bulk Content and Manages Schedule

**Goal:** Test creating multiple posts and calendar management

**Step-by-Step Script:**

1. **Login and Go to Create Post** (0:00)
   - Login and navigate to Create Post

2. **Create First Post** (0:30)
   - Write content for Facebook + Instagram
   - Upload an image
   - Schedule for tomorrow 9 AM
   - Submit

3. **Create Second Post** (2:00)
   - Write different content
   - Select Bluesky only
   - Schedule for tomorrow 2 PM
   - Submit

4. **Create Third Post** (3:30)
   - Write content
   - Select all 3 platforms
   - Save as Draft (do not schedule)

5. **Go to Calendar** (4:30)
   - Navigate to Calendar view
   - Verify both scheduled posts appear on tomorrow

6. **Drag to Reschedule** (5:00)
   - Drag first post from 9 AM slot to 10 AM
   - Observe: Does it update? Confirmation message?

7. **Edit Post from Calendar** (5:30)
   - Click on second post
   - Edit content slightly
   - Save changes

8. **View Drafts** (6:00)
   - Navigate to Drafts
   - Confirm third post appears
   - Click "Continue Editing"
   - Schedule it for day after tomorrow

9. **Delete a Scheduled Post** (7:00)
   - Go back to Scheduled Posts
   - Select one post
   - Click Delete
   - Confirm deletion
   - Verify it's removed

**Success Criteria:**
- [ ] Created 3 posts without errors
- [ ] Calendar displays scheduled posts correctly
- [ ] Drag-drop reschedule works
- [ ] Draft saves and can be scheduled later
- [ ] Deletion works with confirmation

---

### Scenario 4: User Upgrades from Free to Paid Plan

**Goal:** Test the upgrade flow from free tier

**Step-by-Step Script:**

1. **Login as Free User** (0:00)
   - Login with account on free plan

2. **Trigger Upgrade Prompt** (0:30)
   - Try to access a gated feature (e.g., advanced analytics)
   - Or go to Billing page
   - Observe: Upgrade prompt clear?

3. **View Plans** (1:00)
   - Click "Upgrade" or navigate to pricing
   - Review plan options
   - Toggle Monthly/Annual

4. **Select Professional Plan** (1:30)
   - Click "Subscribe" or "Start Trial" on Professional
   - Observe: Redirect to Stripe?

5. **Complete Stripe Checkout** (2:00)
   - Enter test card: 4242 4242 4242 4242
   - Complete payment
   - Observe: Redirect back to app?

6. **Verify Subscription Active** (3:00)
   - Check Billing page shows new plan
   - Verify usage limits updated
   - Try previously gated feature - works now?

7. **Access Stripe Portal** (4:00)
   - Click "Manage Subscription"
   - Verify opens Stripe portal
   - View/download invoice

**Success Criteria:**
- [ ] Upgrade prompt is clear and not annoying
- [ ] Stripe checkout works smoothly
- [ ] Subscription immediately active after payment
- [ ] Gated features now accessible
- [ ] Can manage via Stripe portal

---

### Scenario 5: User Handles Error States Gracefully

**Goal:** Test error handling and recovery

**Step-by-Step Script:**

1. **Simulate Network Error** (0:00)
   - Go offline (disable network in DevTools)
   - Try to load Dashboard
   - Observe: Error message? Retry option?

2. **Restore Network** (1:00)
   - Re-enable network
   - Click retry or refresh
   - Observe: Recovers gracefully?

3. **Simulate Failed Post** (2:00)
   - Create a post for a platform with expired token
   - Try to post now
   - Observe: Error message explains issue? Suggests reconnecting?

4. **Simulate Form Validation Errors** (3:00)
   - Go to Create Post
   - Try to schedule without selecting any platform
   - Observe: Clear error message?

5. **Exceed Character Limit** (3:30)
   - Type very long content (>500 chars for Twitter)
   - Observe: Counter turns red? Cannot submit?

6. **Upload Invalid File** (4:00)
   - Try to upload a .txt or .pdf as media
   - Observe: Clear error about file type?

7. **Test Rate Limiting (if applicable)** (5:00)
   - Rapidly click AI Suggestions multiple times
   - Observe: Rate limit message?

**Success Criteria:**
- [ ] All errors show clear, helpful messages
- [ ] Recovery/retry options provided where appropriate
- [ ] User is never stuck without guidance
- [ ] Form validation prevents invalid submissions

---

## Test Recording Setup

### Equipment
- Screen recording software (OBS, Loom, or built-in)
- Microphone for narrating observations
- Browser DevTools for device simulation

### Recording Checklist
- [ ] Clean browser profile/incognito
- [ ] Visible mouse cursor with click highlight
- [ ] DevTools console visible for errors (can be second monitor)
- [ ] Timer visible in recording

### Deliverables per Test
1. Video recording (MP4)
2. Timestamp log of key events
3. Bug/issue notes with screenshots
4. Pass/Fail status with notes

---

## Issue Severity Ratings

| Severity | Definition | Action |
|----------|------------|--------|
| Critical | Blocks core user flow, data loss | Must fix before release |
| High | Major feature broken, workaround exists | Fix in current sprint |
| Medium | Minor functionality issue | Fix in next sprint |
| Low | Visual polish, minor annoyance | Backlog |

---

## Test Schedule Template

| Test Scenario | Tester | Device | Date | Status | Issues Found |
|---------------|--------|--------|------|--------|--------------|
| Scenario 1 | - | Desktop | - | - | - |
| Scenario 1 | - | Mobile | - | - | - |
| Scenario 2 | - | Desktop | - | - | - |
| ... | ... | ... | ... | ... | ... |
