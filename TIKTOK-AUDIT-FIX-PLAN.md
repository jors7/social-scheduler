# TikTok Audit Fix & Photo Posting Implementation Plan

## 🚨 Critical Issues Causing Audit Rejection

Your app failed TikTok's UX Guidelines audit because it did not follow the required UX implementation guidelines at https://developers.tiktok.com/doc/content-sharing-guidelines/

**TikTok Feedback**: "Your application did not follow our UX Guidelines. All the requirements mentioned in 'Required UX Implementation in Your App' need to be shown in the demo video. Please read each sentence carefully."

---

## Phase 1: Add Creator Info API Integration (CRITICAL)

### Why it failed
TikTok requires querying their `creator_info` API before rendering the post page to get:
- Available privacy level options for this user
- Maximum video duration allowed
- Current posting limits/quotas
- Disabled interaction features

### What to implement
1. **Create new API endpoint**: `/v2/post/publish/creator_info/query/` integration
2. **Call this API**: When TikTok settings panel opens
3. **Store creator info**: In component state
4. **Use data dynamically**: Configure all UI elements based on response

### API Details
```typescript
// Endpoint: POST https://open.tiktokapis.com/v2/post/publish/creator_info/query/
// Response includes:
{
  creator_avatar_url: string,
  creator_username: string,
  privacy_level_options: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
  comment_disabled: boolean,
  duet_disabled: boolean,
  stitch_disabled: boolean,
  max_video_post_duration_sec: number
}
```

### Validation Rules
- Display creator's nickname so users know which account receives content
- Stop publishing if creator_info indicates posting limits reached
- Validate video duration against `max_video_post_duration_sec`
- Grey out disabled interactions

---

## Phase 2: Fix Post Metadata UI (CRITICAL)

### 2.1 Add Separate Title Field
**Current Issue**: Only using content as title
**Required**: Dedicated "Title" input field (separate from description)

**Implementation**:
- Add title input field with 150 character limit
- Keep description/caption field (2200 chars for videos, 4000 for photos)
- Both fields are optional but title is recommended

### 2.2 Fix Privacy Level Selector
**Current Issue**: Defaults to `PUBLIC_TO_EVERYONE` (line 98 in video-settings.tsx)
**Required**: NO default value - user MUST manually select

**Implementation**:
- Remove default value
- Show placeholder "Select privacy level"
- Disable publish button until privacy level selected
- Dynamically populate from `privacy_level_options` in creator_info response
- Use dropdown selection (no radio buttons)

### 2.3 Add Interaction Ability Toggles
**Current Issue**: Missing from UI (exists in service but not exposed to users)
**Required**: Three separate toggles with NO defaults:

**Implementation**:
- **"Allow Comment"** toggle (OFF by default, user must enable)
- **"Allow Duet"** toggle (OFF by default, user must enable)
- **"Allow Stitch"** toggle (OFF by default, user must enable)
- Grey out and disable if creator_info API shows as disabled
- For photo posts: Only display "Allow Comment" option

---

## Phase 3: Add Commercial Content Disclosure (CRITICAL)

### 3.1 Content Disclosure Setting
**Required**: Full commercial content disclosure implementation

**UI Components**:
```
Content Disclosure Setting [Toggle - OFF by default]

When enabled, show:
  ☐ Promotional content (Your Brand - creator's own business)
  ☐ Paid partnership (Branded Content - third party brand)
```

**Validation Rules**:
- At least one checkbox MUST be selected when toggle is ON
- Disable publish button if toggle ON but nothing selected
- Show tooltip: "You need to indicate if your content promotes yourself, a third party, or both"

**API Mapping**:
```typescript
{
  brand_organic_toggle: boolean,  // Promotional content checkbox
  brand_content_toggle: boolean   // Paid partnership checkbox
}
```

### 3.2 Privacy + Commercial Content Validation
**Required**: Branded content only works with public/friends visibility

**Implementation**:
- When "Paid partnership" selected: disable "Private (Only Me)" / "SELF_ONLY" option
- Show tooltip: "Branded content visibility cannot be set to private"
- Auto-switch to "Public" if user selects branded content while private is selected
- OR disable branded content checkbox when "Only Me" is selected

---

## Phase 4: Add Legal Compliance Declarations (CRITICAL)

### Required Consent Text
Add consent text ABOVE the publish button that changes dynamically:

**Default (no commercial content)**:
```
By posting, you agree to TikTok's Music Usage Confirmation
```

**If Promotional content (Your Brand) selected**:
```
By posting, you agree to TikTok's Music Usage Confirmation and Brand Account Policy
```

**If Paid partnership (Branded Content) selected**:
```
By posting, you agree to TikTok's Music Usage Confirmation and Branded Content Policy
```

**If BOTH selected**:
```
By posting, you agree to TikTok's Music Usage Confirmation, Branded Content Policy, and Brand Account Policy
```

### Implementation
- Component: `/components/tiktok/legal-declarations.tsx`
- Props: `{ hasPromotional: boolean, hasBrandedContent: boolean }`
- Styling: Small text, grey color, with links to TikTok policies
- Position: Directly above publish/schedule button

---

## Phase 5: Implement Photo Posting (NEW FEATURE)

### 5.1 Photo Posting API Integration
**Endpoint**: `POST /v2/post/publish/content/init/`
**Media Type**: "PHOTO"

**API Specification**:
```typescript
{
  media_type: "PHOTO",
  post_mode: "DIRECT_POST", // or "MEDIA_UPLOAD"
  post_info: {
    title: string,           // Max 150 chars (UTF-16 runes)
    description: string,     // Max 4000 chars
    privacy_level: string,   // Required for DIRECT_POST
    disable_comment: boolean,
    auto_add_music: boolean,
    brand_content_toggle: boolean,   // Required
    brand_organic_toggle: boolean    // Required
  },
  source_info: {
    source: "PULL_FROM_URL",
    photo_images: string[],    // Up to 35 publicly accessible URLs
    photo_cover_index: number  // 0-based index of cover photo
  }
}
```

**Photo Requirements**:
- Maximum 35 photos per post
- URLs must be publicly accessible
- HTTPS required
- Photo cover index: 0-based (0 = first photo)

### 5.2 Photo-Specific UI Components

**Media Type Selector**:
```
┌────────────────────────────────┐
│ [Video] [Photo] [Carousel]    │
└────────────────────────────────┘
```

**Photo Upload Grid**:
- Show thumbnails of selected images (up to 35)
- Drag-and-drop reordering
- First image is cover by default
- "Set as Cover" button on each image
- Delete individual images
- Upload more images button

**Photo-Specific Settings**:
- Title field (150 chars max)
- Description field (4000 chars max)
- Privacy level dropdown (no default)
- "Allow Comment" toggle only (no Duet/Stitch)
- "Auto-add music" toggle
- Commercial content disclosure
- Legal declarations

### 5.3 Photo Upload Service

**New Method in TikTokService**:
```typescript
async createPhotoPost(
  title: string,
  description: string,
  photoUrls: string[],
  photoCoverIndex: number,
  privacyLevel: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY',
  options: {
    disableComment?: boolean,
    autoAddMusic?: boolean,
    brandContentToggle: boolean,
    brandOrganicToggle: boolean
  }
)
```

**Rate Limits**:
- 6 requests per minute per user access token
- Maximum 5 pending uploads within 24 hours
- Daily post and user quotas apply

### 5.4 Photo Validation
- Minimum 1 photo, maximum 35 photos
- Each photo URL must be publicly accessible
- Verify domain ownership for URL access
- Photo cover index must be valid (0 to photos.length - 1)

---

## Phase 6: Enhanced Validation & Error Handling

### 6.1 Pre-Upload Validation
**Creator Info Checks**:
```typescript
// Before allowing publish
if (videoDuration > creatorInfo.max_video_post_duration_sec) {
  showError(`Video too long. Maximum duration: ${creatorInfo.max_video_post_duration_sec}s`);
  return;
}

if (creatorInfo.posting_limit_reached) {
  showError("You've reached your posting limit. Please try again later.");
  return;
}
```

**Content Disclosure Validation**:
```typescript
if (contentDisclosureEnabled && !promotionalContent && !brandedContent) {
  showError("Please indicate if your content promotes yourself, a third party, or both");
  disablePublishButton();
  return;
}
```

**Privacy + Branded Content Validation**:
```typescript
if (brandedContent && privacyLevel === 'SELF_ONLY') {
  showError("Branded content visibility cannot be set to private");
  return;
}
```

### 6.2 User Notifications & Status Polling
**During Upload**:
- "Uploading your content to TikTok..."
- Progress indicator for file upload

**After Upload**:
- "Your content may take a few minutes to process"
- Implement status polling:
  - Check every 10 seconds
  - Maximum 5 minutes (30 attempts)
  - Call `/v2/post/publish/status/fetch/` endpoint

**Status Messages**:
```typescript
switch (status) {
  case 'PUBLISH_COMPLETE':
    showSuccess('Posted successfully to TikTok!');
    break;
  case 'PROCESSING_UPLOAD':
    showInfo('TikTok is processing your video...');
    break;
  case 'FAILED':
    showError(`Upload failed: ${errorMessage}`);
    break;
}
```

### 6.3 Error Code Handling
```typescript
const ERROR_MESSAGES = {
  'invalid_param': 'Invalid parameters. Please check your content meets TikTok requirements.',
  'unaudited_client_can_only_post_to_private_accounts': 'Your app is pending review. Posts will be saved as drafts.',
  'spam_risk_too_many_pending_share': "You've reached the upload limit. Please try again later.",
  'scope_not_authorized': 'Missing permissions. Please reconnect your TikTok account.',
  'rate_limit_exceeded': 'Too many requests. Please wait a moment and try again.'
};
```

---

## Phase 7: Complete TikTokVideoSettings Component Redesign

### New Component Structure
```
/components/tiktok/
├── video-settings.tsx          # Main settings component
├── photo-settings.tsx          # Photo-specific settings
├── commercial-disclosure.tsx   # Commercial content UI
├── legal-declarations.tsx      # Legal consent component
├── interaction-toggles.tsx     # Comment/Duet/Stitch toggles
└── creator-info-display.tsx    # Show creator username/avatar
```

### Updated video-settings.tsx Layout
```
┌─────────────────────────────────────────────────────┐
│ TikTok Settings                                     │
├─────────────────────────────────────────────────────┤
│ Posting as: @username [avatar]                      │
│                                                     │
│ Media Type: [● Video] [ Photo]                      │
│                                                     │
│ Title (Optional)                                    │
│ ┌─────────────────────────────────────────────┐   │
│ │ Enter a catchy title...                     │   │
│ └─────────────────────────────────────────────┘   │
│ 0 / 150 characters                                 │
│                                                     │
│ Privacy Level *                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Select who can see this video...        ▼  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Interaction Settings                                │
│ ┌─────────────────────────────────────────────┐   │
│ │ [ ] Allow comments                          │   │
│ │ [ ] Allow duet                              │   │
│ │ [ ] Allow stitch                            │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Content Disclosure                                  │
│ ┌─────────────────────────────────────────────┐   │
│ │ [ ] Enable content disclosure           [?] │   │
│ │                                             │   │
│ │ When enabled:                               │   │
│ │   [ ] Promotional content (Your Brand)      │   │
│ │   [ ] Paid partnership (Branded Content)    │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ⚖️ By posting, you agree to TikTok's Music         │
│    Usage Confirmation                               │
│                                                     │
│ ℹ️ Video Requirements:                             │
│ • Duration: 3s to 10min                            │
│ • Aspect ratio: 9:16 recommended                   │
│ • File size: Up to 287.6 MB                        │
│ • Formats: MP4, MOV, AVI, WMV, FLV, MKV            │
└─────────────────────────────────────────────────────┘
```

---

## Files to Create

### New Files (Priority Order)
1. **`/lib/tiktok/creator-info.ts`** - Creator info API service
   ```typescript
   export async function fetchCreatorInfo(accessToken: string)
   export interface CreatorInfo { ... }
   ```

2. **`/app/api/tiktok/creator-info/route.ts`** - Creator info API endpoint
   ```typescript
   POST /api/tiktok/creator-info
   // Returns creator info from TikTok API
   ```

3. **`/components/tiktok/commercial-disclosure.tsx`** - Commercial content UI
   ```typescript
   interface Props {
     enabled: boolean;
     onEnabledChange: (enabled: boolean) => void;
     promotionalContent: boolean;
     onPromotionalChange: (checked: boolean) => void;
     brandedContent: boolean;
     onBrandedChange: (checked: boolean) => void;
   }
   ```

4. **`/components/tiktok/legal-declarations.tsx`** - Legal consent component
   ```typescript
   interface Props {
     hasPromotional: boolean;
     hasBrandedContent: boolean;
   }
   ```

5. **`/components/tiktok/interaction-toggles.tsx`** - Comment/Duet/Stitch toggles
   ```typescript
   interface Props {
     allowComment: boolean;
     allowDuet: boolean;
     allowStitch: boolean;
     commentDisabled: boolean; // from creator info
     duetDisabled: boolean;
     stitchDisabled: boolean;
     isPhotoPost: boolean;
     onChange: (setting: string, value: boolean) => void;
   }
   ```

6. **`/lib/tiktok/photo-service.ts`** - Photo posting service
   ```typescript
   export async function createPhotoPost(...)
   ```

7. **`/components/tiktok/photo-settings.tsx`** - Photo-specific settings
   ```typescript
   // Similar to video-settings but for photos
   ```

---

## Files to Modify

### High Priority Modifications
1. **`/components/tiktok/video-settings.tsx`**
   - Remove default privacy level value
   - Add title field
   - Integrate commercial disclosure component
   - Integrate interaction toggles component
   - Integrate legal declarations component
   - Add creator info display
   - Add validation for all required fields

2. **`/lib/tiktok/service.ts`**
   - Add `fetchCreatorInfo()` method
   - Add `createPhotoPost()` method
   - Update `createPost()` to include commercial content fields
   - Update `createPostWithFileUpload()` to include commercial content fields
   - Add validation for commercial content + privacy level

3. **`/app/api/post/tiktok/route.ts`**
   - Handle photo posts (check for media_type)
   - Add commercial content fields to API
   - Add title field (separate from content)
   - Enhanced validation

4. **`/lib/posting/service.ts`**
   - Add photo upload support for TikTok
   - Pass commercial content settings
   - Pass interaction settings

5. **`/app/dashboard/create/new/page.tsx`**
   - Add state for title field
   - Add state for commercial content settings
   - Add state for interaction toggles
   - Add state for creator info
   - Fetch creator info when TikTok selected
   - Pass new props to TikTokVideoSettings
   - Support photo uploads for TikTok

---

## Implementation Priority

### 🔴 MUST FIX FOR AUDIT (Priority 1)
These are explicitly mentioned in TikTok's rejection feedback:

1. ✅ **Creator info API integration** - Query before rendering
2. ✅ **Remove default privacy level** - User must manually select
3. ✅ **Add interaction toggles** - Comment/Duet/Stitch with NO defaults
4. ✅ **Commercial content disclosure** - Full implementation with validation
5. ✅ **Legal compliance declarations** - Dynamic based on selections
6. ✅ **Privacy + commercial validation** - Branded content cannot be private

### 🟡 SHOULD ADD (Priority 2)
Important for UX and compliance:

7. ✅ **Title field** - Separate from description
8. ✅ **Creator display** - Show username/avatar
9. ✅ **Enhanced error messages** - User-friendly feedback
10. ✅ **Publish button validation** - Disable until all required fields filled

### 🟢 NICE TO HAVE (Priority 3)
New features and improvements:

11. ✅ **Photo posting support** - Full implementation
12. ✅ **Status polling** - Real-time upload status
13. ✅ **Auto-add music** - For photo posts

---

## Success Criteria

### For TikTok Audit Approval ✅
- [ ] Creator info API called before rendering post UI
- [ ] NO default privacy level (user must manually select)
- [ ] All interaction toggles visible and functional (Comment/Duet/Stitch)
- [ ] Interaction toggles grey out when disabled by creator_info
- [ ] Commercial content disclosure fully implemented
- [ ] Content disclosure validation: must select at least one option when enabled
- [ ] Privacy + commercial content validation: branded content cannot be private
- [ ] Legal declarations displayed correctly and change based on selections
- [ ] Demo video showing ALL required UX elements
- [ ] Each sentence in TikTok guidelines explicitly addressed

### For Photo Posting Feature ✅
- [ ] Can select 1-35 photos for upload
- [ ] Photo cover selection works (set which photo is thumbnail)
- [ ] Auto-add music toggle functional
- [ ] Photos post successfully to TikTok
- [ ] Title (150 chars) and description (4000 chars) fields work
- [ ] Only "Allow Comment" toggle shown for photos (no Duet/Stitch)

---

## Testing Checklist

### Before Submitting for Re-Audit
1. **Record comprehensive demo video** showing:
   - [ ] Creator info loaded (username/avatar displayed)
   - [ ] Privacy level selector with NO default (user must select)
   - [ ] All three interaction toggles (Comment, Duet, Stitch)
   - [ ] Toggles grey out when disabled by creator settings
   - [ ] Content disclosure setting toggle
   - [ ] Promotional content and Paid partnership checkboxes
   - [ ] Validation: publish disabled when disclosure on but nothing selected
   - [ ] Privacy validation: branded content cannot be private
   - [ ] Legal declarations changing based on selections
   - [ ] Complete video post flow from start to finish
   - [ ] Complete photo post flow (bonus)

2. **Test all privacy level combinations**:
   - [ ] Public + no commercial content
   - [ ] Public + promotional content
   - [ ] Public + branded content
   - [ ] Public + both
   - [ ] Friends + all combinations
   - [ ] Private + no commercial (should work)
   - [ ] Private + commercial (should be blocked)

3. **Test commercial content disclosure**:
   - [ ] Toggle on, no checkboxes = publish disabled
   - [ ] Toggle on, promotional only = works
   - [ ] Toggle on, branded only = works (not private)
   - [ ] Toggle on, both = works (not private)
   - [ ] Toggle off = no validation needed

4. **Test validation**:
   - [ ] Video duration exceeds max = blocked
   - [ ] Posting limit reached = blocked
   - [ ] No privacy selected = publish disabled
   - [ ] Branded content + private = blocked

5. **Test photo posting**:
   - [ ] 1 photo upload
   - [ ] 10 photos upload
   - [ ] 35 photos upload (max)
   - [ ] Photo cover selection
   - [ ] Auto-add music toggle
   - [ ] Only Comment toggle visible (no Duet/Stitch)

---

## Estimated Implementation Time

| Phase | Task | Time Estimate |
|-------|------|---------------|
| 1 | Creator Info API | 3-4 hours |
| 2 | Metadata UI Fixes | 2-3 hours |
| 3 | Commercial Content | 3-4 hours |
| 4 | Legal Declarations | 1-2 hours |
| 5 | Photo Posting | 5-6 hours |
| 6 | Validation & Errors | 2-3 hours |
| 7 | UI Redesign & Polish | 3-4 hours |
| **Total** | **Full Implementation** | **19-26 hours** |

---

## Demo Video Requirements

When recording demo video for re-audit, explicitly show:

1. **Opening the TikTok settings panel**
   - Show creator username and avatar loading from API

2. **Privacy level selector**
   - Show it has NO default value
   - Show placeholder "Select privacy level"
   - Show user manually selecting a value

3. **Interaction toggles**
   - Show all three toggles: Allow Comment, Allow Duet, Allow Stitch
   - Show they are OFF by default
   - Show user manually enabling them
   - (Bonus) Show them greyed out if disabled by creator settings

4. **Commercial content disclosure**
   - Show "Content Disclosure Setting" toggle OFF
   - Turn it ON
   - Show two checkboxes appear: Promotional content, Paid partnership
   - Try to publish without selecting = show error
   - Select one checkbox = works

5. **Privacy + Commercial validation**
   - Select "Paid partnership"
   - Try to select "Private" = show error or auto-switch to Public

6. **Legal declarations**
   - Show default text: "Music Usage Confirmation"
   - Enable promotional = show updated text
   - Enable branded = show updated text
   - Enable both = show both policies

7. **Complete post flow**
   - Fill in all fields
   - Validate all requirements met
   - Click publish
   - Show success message

---

## Notes from TikTok Documentation

### Key Requirements (Direct Quotes)
> "Display the creator's nickname so users know which TikTok account receives the content"

> "Retrieve latest creator info when rendering the post page"

> "Follow `privacy_level_options` from creator_info API - Use dropdown selection with no default value - Users must manually choose privacy level"

> "Allow Comment, Duet, and Stitch toggles - Grey out and disable interactions that creator_info API shows as disabled - No defaults; users must manually enable each"

> "Include 'Content Disclosure Setting' toggle (off by default)"

> "Require at least one selection when toggle is on"

> "Disable publish button if toggle is on but nothing selected"

> "Branded content only works with public/friends visibility"

> "Include appropriate consent before publish button"

### Photo Posting Specs
> "Maximum quantity: 35 photos per post"

> "Photo posts: display only 'Allow Comment' option"

> "Title: Maximum 90 UTF-16 runes (150 chars)"

> "Description: Up to 4000 UTF-16 runes"

---

## References

- **Content Sharing Guidelines**: https://developers.tiktok.com/doc/content-sharing-guidelines/
- **Photo Posting API**: https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
- **Creator Info API**: https://developers.tiktok.com/doc/content-posting-api-reference-creator-info-query
- **Video Posting API**: https://developers.tiktok.com/doc/content-posting-api-direct-post

---

## Implementation Start Date
2025-10-30

## Target Completion Date
2025-11-06 (1 week)

## Re-Audit Submission Target
2025-11-08

---

**End of Plan Document**
