# Threads Multi-Post Feature - Visual Guide

## Video Storyboard

### Frame 1: Title Screen (0:00-0:03)
```
┌────────────────────────────────────┐
│                                    │
│         SocialCal                  │
│    Multi-Post Threads Demo         │
│                                    │
│   Smart Fallback System for        │
│     Threads API Limitations        │
│                                    │
└────────────────────────────────────┘
```

### Frame 2: Problem Overview (0:03-0:10)
```
┌────────────────────────────────────┐
│   The Challenge:                   │
│   ┌──────────────────────────┐     │
│   │ ❌ threads_manage_replies │     │
│   │    Not Approved by Meta   │     │
│   └──────────────────────────┘     │
│                                    │
│   Our Solution:                    │
│   ✅ Test Accounts → Real Threads  │
│   ✅ Production → Numbered Posts   │
└────────────────────────────────────┘
```

### Frame 3: Dashboard View (0:10-0:15)
```
┌────────────────────────────────────┐
│ SocialCal Dashboard                │
├────────────────────────────────────┤
│ 📝 Create New Post                 │
│                                    │
│ Platform: [✓] Threads             │
│                                    │
│ Account: @thejanorsula (test)     │
└────────────────────────────────────┘
```

### Frame 4: Thread Composer (0:15-0:30)
```
┌────────────────────────────────────┐
│ Create Thread                      │
├────────────────────────────────────┤
│ ┌─ Post 1 ─────────────────────┐  │
│ │ 🚀 3 Tips for Social Media   │  │
│ │ Engagement                    │  │
│ └───────────────────────────────┘  │
│           │                        │
│ ┌─ Post 2 ─────────────────────┐  │
│ │ 💡 Tip 1: Post consistently  │  │
│ │ at peak times                 │  │
│ └───────────────────────────────┘  │
│           │                        │
│ ┌─ Post 3 ─────────────────────┐  │
│ │ ✨ Tip 2: Quality hashtags   │  │
│ │ over quantity                 │  │
│ └───────────────────────────────┘  │
│                                    │
│ [Post Now] button                  │
└────────────────────────────────────┘
```

### Frame 5: API Flow Diagram (0:30-0:40)
```
┌────────────────────────────────────┐
│         How It Works               │
├────────────────────────────────────┤
│                                    │
│   User Creates Thread              │
│           ↓                        │
│   Try: /api/threads/thread         │
│   (with reply_to_id)               │
│           ↓                        │
│   ┌───────────────┐                │
│   │ Success?      │                │
│   └───────────────┘                │
│    ↙           ↘                   │
│  YES            NO                 │
│   ↓              ↓                 │
│ Connected    Permission            │
│  Thread        Error?              │
│                  ↓                 │
│              Fallback:             │
│          /api/threads/             │
│          thread-numbered           │
│                  ↓                 │
│            Numbered Posts          │
└────────────────────────────────────┘
```

### Frame 6: Success Messages (0:40-0:45)
```
┌────────────────────────────────────┐
│ Test Account Result:               │
│ ┌──────────────────────────────┐   │
│ │ ✅ Thread posted as          │   │
│ │    connected replies         │   │
│ │    (test account privilege)  │   │
│ └──────────────────────────────┘   │
│                                    │
│ Production Account Result:         │
│ ┌──────────────────────────────┐   │
│ │ ℹ️ Thread posted with        │   │
│ │    numbering [1/3], [2/3]... │   │
│ │    (standard account)        │   │
│ └──────────────────────────────┘   │
└────────────────────────────────────┘
```

### Frame 7: Threads.net - Connected (0:45-0:55)
```
┌────────────────────────────────────┐
│ threads.net/@thejanorsula          │
├────────────────────────────────────┤
│                                    │
│ @thejanorsula                      │
│ 🚀 3 Tips for Social Media         │
│ Engagement                         │
│ 2m                                 │
│ └─ @thejanorsula replied:          │
│    💡 Tip 1: Post consistently     │
│    at peak times                   │
│    1m                              │
│    └─ @thejanorsula replied:       │
│       ✨ Tip 2: Quality hashtags   │
│       over quantity                │
│       1m                           │
│                                    │
│ [Connected thread indicator →]     │
└────────────────────────────────────┘
```

### Frame 8: Threads.net - Numbered (0:55-1:05)
```
┌────────────────────────────────────┐
│ threads.net/@regularuser           │
├────────────────────────────────────┤
│                                    │
│ @regularuser                       │
│ [3/3] ✨ Tip 2: Quality hashtags   │
│ over quantity                      │
│ 1m                                 │
│                                    │
│ @regularuser                       │
│ [2/3] 💡 Tip 1: Post consistently  │
│ at peak times                      │
│ 2m                                 │
│                                    │
│ @regularuser                       │
│ [1/3] 🚀 3 Tips for Social Media   │
│ Engagement                         │
│ 3m                                 │
│                                    │
│ [Separate posts, no connection]    │
└────────────────────────────────────┘
```

### Frame 9: Code Example (1:05-1:15)
```
┌────────────────────────────────────┐
│ Implementation Code                │
├────────────────────────────────────┤
│```javascript                       │
│// Smart fallback system            │
│try {                               │
│  // Try connected thread           │
│  response = await fetch(           │
│    '/api/post/threads/thread',     │
│    { reply_to_id: prevId }         │
│  )                                 │
│} catch (permissionError) {         │
│  // Auto-fallback                  │
│  response = await fetch(           │
│    '/api/post/threads/numbered'    │
│  )                                 │
│}                                   │
│```                                 │
└────────────────────────────────────┘
```

### Frame 10: Benefits Summary (1:15-1:25)
```
┌────────────────────────────────────┐
│        Why This Matters            │
├────────────────────────────────────┤
│                                    │
│ ✅ Works for ALL users             │
│                                    │
│ ✅ No configuration needed         │
│                                    │
│ ✅ Automatic detection             │
│                                    │
│ ✅ Future-ready when approved      │
│                                    │
│ ✅ Seamless user experience        │
│                                    │
└────────────────────────────────────┘
```

### Frame 11: Call to Action (1:25-1:30)
```
┌────────────────────────────────────┐
│                                    │
│      Try SocialCal Today!          │
│                                    │
│    Schedule posts across all       │
│     your social platforms          │
│                                    │
│    www.socialcal.app               │
│                                    │
│  [Sign Up Free] [Learn More]       │
│                                    │
└────────────────────────────────────┘
```

## Screen Recording Annotations

### Mouse/Cursor Highlights
- **Yellow circle**: Around cursor when clicking
- **Red arrow**: Pointing to important elements
- **Green checkmark**: When action succeeds
- **Orange box**: Around error messages

### Text Overlays
```
Position: Top-right corner
Font: Sans-serif, 14px
Background: Semi-transparent black
Text color: White

Examples:
- "Test Account Mode"
- "Attempting Connected Thread..."
- "Fallback Activated"
- "Success!"
```

### Transition Effects
- **Fade**: Between major sections
- **Slide**: When switching tabs/windows
- **Zoom**: To highlight specific UI elements
- **Highlight pulse**: For important buttons

## Visual Assets Checklist

### Icons/Emojis to Use
- ✅ Success/checkmark
- ❌ Error/not available
- ⚠️ Warning/fallback
- 🔄 Processing/loading
- 📱 Mobile/Threads app
- 💻 Desktop/browser
- 🚀 Launch/post
- 💡 Tip/insight
- ✨ Feature/enhancement
- 🔗 Link/connection

### Color Scheme
```css
/* Primary */
--primary: #6B46C1;      /* Purple */
--primary-light: #9333EA; /* Light purple */

/* Status Colors */
--success: #10B981;      /* Green */
--warning: #F59E0B;      /* Orange */
--error: #EF4444;        /* Red */
--info: #3B82F6;         /* Blue */

/* Neutral */
--text: #1F2937;         /* Dark gray */
--background: #FFFFFF;   /* White */
--border: #E5E7EB;       /* Light gray */
```

### Font Hierarchy
```
Title: 24px bold
Subtitle: 18px semibold
Body: 14px regular
Caption: 12px regular
Code: 13px monospace
```

## Recording Setup

### OBS Studio Scenes

#### Scene 1: Browser Capture
- Source: Window capture (Chrome/Firefox)
- Filter: Crop to content area
- Resolution: 1920x1080

#### Scene 2: Code Editor
- Source: Window capture (VS Code)
- Filter: Increase font size to 14px
- Theme: Dark theme for contrast

#### Scene 3: Split Screen
- Left: SocialCal dashboard (60%)
- Right: Threads.net (40%)
- Border: 2px white divider

#### Scene 4: Mobile Simulator
- Source: iPhone simulator or Android emulator
- Position: Centered
- Background: Blurred desktop

### Audio Settings
- Microphone: -12db
- Noise suppression: On
- Background music: -24db (optional)
- Format: 48kHz, stereo

## Quick Reference Card

### Key Messages (for voiceover)
1. "Smart automatic fallback"
2. "No configuration required"
3. "Works for everyone"
4. "Test accounts get full features"
5. "Production-ready solution"

### Timestamps
- 0:00 - Title
- 0:10 - Dashboard demo starts
- 0:30 - API explanation
- 0:45 - Show results on Threads
- 1:05 - Technical details
- 1:25 - Call to action
- 1:30 - End

### B-Roll Options
- API documentation page
- Meta Developer Console
- Code implementation
- User testimonials
- Platform logos animation

## Export Settings

### YouTube/Web
- Resolution: 1920x1080 (1080p)
- Frame rate: 30fps
- Codec: H.264
- Bitrate: 8-10 Mbps
- Audio: AAC, 192kbps

### Social Media (Square)
- Resolution: 1080x1080
- Frame rate: 30fps
- Duration: Max 60 seconds
- Captions: Burned in

### Social Media (Vertical)
- Resolution: 1080x1920 (9:16)
- Frame rate: 30fps
- Duration: Max 30 seconds
- Captions: Required