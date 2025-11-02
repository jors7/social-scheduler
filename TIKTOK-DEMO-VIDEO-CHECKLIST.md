# TikTok Audit Demo Video - Complete Checklist

**Purpose:** Record a comprehensive demo video showing ALL TikTok UX Guidelines requirements
**Target Audience:** TikTok App Review Team
**Duration:** 5-8 minutes
**Recording Quality:** 1080p minimum, clear audio

---

## 🎥 Pre-Recording Checklist

### Equipment & Setup
- [ ] Screen recording software ready (QuickTime, OBS, or similar)
- [ ] Microphone tested (clear audio is important)
- [ ] Browser window sized to 1920x1080 or similar
- [ ] TikTok account connected and verified
- [ ] Test video file ready (3-60 seconds, MP4 format)
- [ ] Test photos ready (2-5 images for photo posting demo)
- [ ] Close unnecessary browser tabs
- [ ] Disable notifications/popups
- [ ] Clear previous test data

### Application Setup
- [ ] Development server running (`npm run dev`)
- [ ] Navigate to create post page
- [ ] Verify TikTok is available in platform list
- [ ] Verify TikTok account is connected

### Practice Run
- [ ] Do a complete practice recording
- [ ] Check video quality and audio
- [ ] Ensure all features work as expected
- [ ] Time the recording (should be 5-8 minutes)

---

## 📋 Recording Script

### Introduction (30 seconds)
**What to say:**
"Hello, TikTok Review Team. This is a demonstration of our updated TikTok integration, showing all required UX implementations from your Content Sharing Guidelines. I'll walk through each requirement step by step."

**What to show:**
- [ ] App homepage/dashboard
- [ ] Navigate to "Create New Post" page
- [ ] Show platform selection grid

---

### Part 1: Creator Information Retrieval (1 minute)

#### 1.1 Display Creator Info
**What to say:**
"First, let me select TikTok as the platform. Notice that we retrieve and display the creator's information."

**What to show:**
- [ ] Click on TikTok platform tile
- [ ] TikTok settings panel appears
- [ ] Point to creator info section at top
- [ ] Highlight username display: "Posting as: @[username]"
- [ ] Highlight avatar/profile picture
- [ ] **CRITICAL:** Say "We query the creator_info API when rendering this page"

#### 1.2 Creator Settings
**What to say:**
"The creator info API also tells us which interaction settings are available for this creator."

**What to show:**
- [ ] Scroll to interaction toggles section
- [ ] Point out that toggles respect creator settings
- [ ] (If any are disabled) Show greyed-out toggle with explanation text

**TikTok Guideline Reference:**
> "Display the creator's nickname so users know which TikTok account receives the content"
> "Retrieve latest creator info when rendering the post page"

---

### Part 2: Post Metadata - Title Field (30 seconds)

#### 2.1 Title Input
**What to say:**
"We provide a dedicated title field, separate from the caption/description, which users can fully edit."

**What to show:**
- [ ] Point to title input field
- [ ] Type sample title: "Amazing Sunset Views"
- [ ] Show character counter (0 / 150 or 2200)
- [ ] Edit/delete text to show it's fully editable

**TikTok Guideline Reference:**
> "Allow full user editing before posting"

---

### Part 3: Privacy Level Selection (1 minute)

#### 3.1 No Default Value
**What to say:**
"For privacy settings, notice there is NO default value selected. The user MUST manually choose their privacy level."

**What to show:**
- [ ] Point to Privacy Level dropdown
- [ ] Show placeholder text: "Select who can see this post..."
- [ ] **CRITICAL:** Emphasize field is empty - no selection made yet
- [ ] Hover over dropdown (don't click yet)

#### 3.2 Manual Selection
**What to say:**
"Now I'll manually select a privacy level. The options come from the creator_info API."

**What to show:**
- [ ] Click privacy dropdown
- [ ] Show all available options:
  - Public - Everyone can see this video
  - Friends - Only mutual friends can see
  - Private - Only you can see (saved as draft)
- [ ] Select "Public"
- [ ] Show selection is now visible in dropdown

**TikTok Guideline Reference:**
> "Follow privacy_level_options from creator_info API"
> "Use dropdown selection with no default value"
> "Users must manually choose privacy level"

---

### Part 4: Interaction Abilities (1.5 minutes)

#### 4.1 All Toggles OFF by Default
**What to say:**
"For interaction settings, all three toggles start in the OFF position. There are NO defaults - users must manually enable each one they want."

**What to show:**
- [ ] Scroll to "Interaction Settings" section
- [ ] Point to "Allow Comment" toggle - OFF
- [ ] Point to "Allow Duet" toggle - OFF
- [ ] Point to "Allow Stitch" toggle - OFF
- [ ] **CRITICAL:** Emphasize all are OFF by default

#### 4.2 Manual Enabling
**What to say:**
"Now I'll manually enable each interaction that I want for this post."

**What to show:**
- [ ] Click "Allow Comment" toggle - turns ON
- [ ] Click "Allow Duet" toggle - turns ON
- [ ] Click "Allow Stitch" toggle - turns ON
- [ ] Show visual change (toggle switches from grey to blue/active)

#### 4.3 Creator Settings Respected (If applicable)
**What to say (if any are disabled):**
"Notice that if a creator has disabled certain interactions in their TikTok settings, those toggles are greyed out and cannot be enabled."

**What to show (if applicable):**
- [ ] Point to any disabled toggle
- [ ] Show grey appearance
- [ ] Show explanation text: "Duet is disabled in your TikTok settings"

**TikTok Guideline Reference:**
> "Allow Comment, Duet, and Stitch toggles"
> "Grey out and disable interactions that creator_info API shows as disabled"
> "No defaults; users must manually enable each"

---

### Part 5: Commercial Content Disclosure (2 minutes)

#### 5.1 Content Disclosure Toggle (OFF by Default)
**What to say:**
"For commercial content, we have a 'Content Disclosure Setting' toggle which is OFF by default."

**What to show:**
- [ ] Scroll to "Content Disclosure" section
- [ ] Point to main toggle - OFF
- [ ] Show toggle label: "Content Disclosure Setting"
- [ ] Show description: "Enable if your content is promotional or sponsored"

#### 5.2 Enable and Show Checkboxes
**What to say:**
"When I enable this toggle, two checkboxes appear for the user to specify the type of commercial content."

**What to show:**
- [ ] Click Content Disclosure toggle - turns ON
- [ ] Two checkboxes appear:
  - [ ] Promotional content (Your Brand)
  - [ ] Paid partnership (Branded Content)
- [ ] Show descriptions for each checkbox

#### 5.3 Validation - No Selection
**What to say:**
"If the toggle is enabled but nothing is selected, the user cannot publish. Let me demonstrate this validation."

**What to show:**
- [ ] Leave both checkboxes unchecked
- [ ] Try to click "Publish" or "Schedule" button
- [ ] Error message appears: "Please select at least one commercial content option or disable content disclosure"
- [ ] Show warning tooltip or error message clearly

#### 5.4 Select Options
**What to say:**
"Now I'll select 'Promotional content' to indicate this promotes my own business."

**What to show:**
- [ ] Check "Promotional content" checkbox
- [ ] Error message disappears
- [ ] (Optional) Also check "Paid partnership" to show both can be selected

**TikTok Guideline Reference:**
> "Include 'Content Disclosure Setting' toggle (off by default)"
> "When enabled, display checkboxes for: Your Brand, Branded Content"
> "Require at least one selection when toggle is on"
> "Disable publish button if toggle is on but nothing selected"

---

### Part 6: Privacy + Commercial Content Validation (1 minute)

#### 6.1 Branded Content + Private Restriction
**What to say:**
"TikTok requires that branded content cannot be posted with private visibility. Let me demonstrate this validation."

**What to show:**
- [ ] Ensure "Paid partnership" checkbox is checked
- [ ] Go back to Privacy Level dropdown
- [ ] Try to select "Private (Only Me)"
- [ ] Warning message appears: "Branded content visibility cannot be set to private"
- [ ] Show warning clearly (red text, border, or tooltip)

#### 6.2 Fix Validation
**What to say:**
"To fix this, I'll change the privacy level back to Public or Friends."

**What to show:**
- [ ] Select "Public" from dropdown
- [ ] Warning message disappears
- [ ] Show validation passes (no red borders/text)

**TikTok Guideline Reference:**
> "Branded content only works with public/friends visibility"
> "Disable 'only me' permission when branded content is selected"
> "Show tooltip: 'Branded content visibility cannot be set to private'"

---

### Part 7: Legal Compliance Declarations (1 minute)

#### 7.1 Default Declaration
**What to say:**
"Before publishing, users must agree to TikTok's policies. The declaration text changes based on what's selected."

**What to show:**
- [ ] Scroll to bottom of TikTok settings
- [ ] Point to legal declaration text
- [ ] Show default: "By posting, you agree to TikTok's Music Usage Confirmation"

#### 7.2 Promotional Content Declaration
**What to say:**
"When I enable promotional content, the declaration updates to include the Brand Account Policy."

**What to show:**
- [ ] Uncheck both commercial content boxes
- [ ] Check only "Promotional content"
- [ ] Legal text updates: "...Music Usage Confirmation and Brand Account Policy"

#### 7.3 Branded Content Declaration
**What to say:**
"When I enable paid partnership, it includes the Branded Content Policy."

**What to show:**
- [ ] Uncheck "Promotional content"
- [ ] Check only "Paid partnership"
- [ ] Legal text updates: "...Music Usage Confirmation and Branded Content Policy"

#### 7.4 Both Selected
**What to say:**
"And when both are selected, it includes all three policies."

**What to show:**
- [ ] Check both checkboxes
- [ ] Legal text shows: "...Music Usage Confirmation, Branded Content Policy, and Brand Account Policy"
- [ ] Point to clickable policy links

**TikTok Guideline Reference:**
> "Include appropriate consent before publish button"
> "Standard: TikTok's Music Usage Confirmation"
> "Branded only: Add Branded Content Policy"
> "Both options: Include both policies"

---

### Part 8: Complete Post Flow (1.5 minutes)

#### 8.1 Add Content
**What to say:**
"Now let me complete a full post to show the entire flow working together."

**What to show:**
- [ ] Type caption/content: "Check out this amazing content! #viral #fyp"
- [ ] Upload video file (or photo)
- [ ] Show video/photo preview thumbnail

#### 8.2 Verify All Settings
**What to say:**
"Let me verify all required fields are filled:"

**What to show:**
- [ ] Title: ✓ Filled
- [ ] Privacy Level: ✓ Selected (Public)
- [ ] Interaction Toggles: ✓ At least one enabled
- [ ] Commercial Content: ✓ Valid (either disabled or with selection)
- [ ] Legal Declaration: ✓ Displayed

#### 8.3 Publish
**What to say:**
"All requirements are met. Now I can publish the post."

**What to show:**
- [ ] Click "Publish" button
- [ ] Show loading/progress indicator
- [ ] Success message appears
- [ ] (Optional) Show "Processing may take a few minutes" message

---

### Part 9: Photo Posting (BONUS - 1 minute)

#### 9.1 Select Photos
**What to say:**
"TikTok now supports photo posts. Let me demonstrate this feature."

**What to show:**
- [ ] Clear previous content
- [ ] Upload 3-5 photos instead of video
- [ ] Show photo grid with thumbnails

#### 9.2 Photo-Specific Settings
**What to say:**
"Notice that for photo posts, only the 'Allow Comment' toggle is shown - Duet and Stitch are not available for photos."

**What to show:**
- [ ] Scroll to Interaction Settings
- [ ] Show only "Allow Comment" toggle visible
- [ ] No "Allow Duet" or "Allow Stitch" for photos
- [ ] All other settings remain the same

#### 9.3 Photo Post
**What to show:**
- [ ] Fill in title (150 char limit for photos)
- [ ] Select privacy level
- [ ] Enable comment toggle
- [ ] Click publish
- [ ] Success message

---

### Conclusion (30 seconds)
**What to say:**
"This completes the demonstration of all required UX implementations from TikTok's Content Sharing Guidelines. Our integration:
1. Displays creator information
2. Requires manual privacy selection with no defaults
3. Provides interaction toggles with no defaults
4. Implements full commercial content disclosure with validation
5. Enforces privacy restrictions for branded content
6. Shows appropriate legal declarations
7. Supports both video and photo posting

Thank you for reviewing our application."

**What to show:**
- [ ] Show final successful post
- [ ] Navigate back to dashboard/main screen

---

## ✅ Post-Recording Checklist

### Video Quality Check
- [ ] Video is clear (1080p or higher)
- [ ] Audio is clear and understandable
- [ ] No cuts or interruptions
- [ ] All UI elements are readable
- [ ] Mouse cursor is visible when clicking
- [ ] Duration is 5-8 minutes

### Content Verification
- [ ] Every requirement shown explicitly
- [ ] Each section narrated clearly
- [ ] All toggles/checkboxes visible
- [ ] All validation errors demonstrated
- [ ] Legal declarations shown changing
- [ ] Complete flow from start to finish

### Compliance Check
Cross-reference with TikTok's guidelines document:
- [ ] Section 1: Creator Information ✓
- [ ] Section 2: Post Metadata (Title) ✓
- [ ] Section 2: Post Metadata (Privacy) ✓
- [ ] Section 2: Post Metadata (Interactions) ✓
- [ ] Section 3: Commercial Content Disclosure ✓
- [ ] Section 4: Privacy Management ✓
- [ ] Section 5: Legal Compliance ✓
- [ ] Section 6: User Control ✓

---

## 📤 Submission Guidelines

### Video File
- **Format:** MP4 (H.264 codec)
- **Resolution:** 1920x1080 minimum
- **Frame Rate:** 30fps minimum
- **Audio:** Clear narration (optional but recommended)
- **File Size:** Under 500MB (compress if needed)

### Submission Text
Include this with your video:

```
Subject: TikTok Integration Demo - UX Guidelines Compliance

Dear TikTok Review Team,

We have updated our TikTok integration to fully comply with the Content Sharing Guidelines. This demo video demonstrates all required UX implementations:

1. Creator Information Retrieval (0:30 - 1:30)
   - Display creator nickname and avatar
   - Retrieve from creator_info API
   - Respect creator settings

2. Post Metadata Requirements (1:30 - 3:00)
   - Title field with full editing capability
   - Privacy level selector with NO default value
   - Manual privacy selection required
   - Interaction toggles (Comment/Duet/Stitch) with NO defaults

3. Commercial Content Disclosure (3:00 - 5:00)
   - Content Disclosure toggle (off by default)
   - Promotional content checkbox
   - Paid partnership checkbox
   - Validation requiring at least one selection

4. Privacy + Commercial Validation (5:00 - 6:00)
   - Branded content cannot be private
   - Warning tooltip displayed
   - Automatic validation

5. Legal Compliance Declarations (6:00 - 7:00)
   - Music Usage Confirmation (always)
   - Branded Content Policy (conditional)
   - Brand Account Policy (conditional)
   - Dynamic based on user selections

6. Complete Post Flow (7:00 - 8:00)
   - Full demonstration from start to finish
   - All validations working
   - Successful post creation

All requirements from the Content Sharing Guidelines have been implemented and are demonstrated in this video.

Thank you for your review.

Best regards,
[Your Name]
[Your App Name]
```

---

## 🎬 Recording Tips

### Do:
- ✅ Speak clearly and at a moderate pace
- ✅ Use a cursor highlighter if possible
- ✅ Pause briefly after each action
- ✅ Point out each requirement explicitly
- ✅ Show the full screen (no cutoffs)
- ✅ Use a quiet recording environment

### Don't:
- ❌ Rush through sections
- ❌ Skip any requirements
- ❌ Assume reviewers know the UI
- ❌ Have background noise/music
- ❌ Cut or edit the video heavily
- ❌ Show errors without fixing them

---

## 📞 Troubleshooting

### Common Issues

**Issue:** Video file too large
**Solution:** Use Handbrake or similar to compress (target ~200MB)

**Issue:** Creator info not loading
**Solution:** Reconnect TikTok account, refresh page

**Issue:** Validation not working
**Solution:** Clear browser cache, restart dev server

**Issue:** Audio not recording
**Solution:** Check system audio settings, test microphone

---

## ✨ Success Criteria

Your demo video is ready to submit when:

- [x] All 6 main sections are demonstrated
- [x] Each requirement is explicitly shown and called out
- [x] Video quality is clear (1080p+)
- [x] Audio is clear (if narrated)
- [x] Duration is 5-8 minutes
- [x] No errors or broken features
- [x] Complete post flow works end-to-end
- [x] All validations demonstrated
- [x] Legal declarations shown changing

---

**Good luck with your re-submission!**

For any questions or issues, refer to:
- `/TIKTOK-AUDIT-FIX-PLAN.md` - Complete implementation plan
- `/TIKTOK-IMPLEMENTATION-PROGRESS.md` - Detailed progress tracking
- `/TIKTOK-IMPLEMENTATION-SUMMARY.md` - Summary and next steps

---

**Last Updated:** 2025-10-30
**Review Deadline:** 2025-11-08
