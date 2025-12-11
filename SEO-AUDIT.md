# SEO & Pre-Launch Audit

**Date:** December 10, 2025
**Project:** SocialCal (socialcal.app)

---

## Current Status Overview

### What's Already Working Well

| Element | Status | Location |
|---------|--------|----------|
| `<title>` | Complete | Root layout + per-page |
| `<meta description>` | Complete | Root layout + per-page |
| OpenGraph tags | Complete | Full implementation with images |
| Twitter Card | Complete | `summary_large_image` configured |
| robots.txt | Dynamic | `app/robots.ts` (Next.js convention) |
| sitemap.xml | Dynamic | `app/sitemap.ts` with DB integration |
| manifest.json | Present | PWA-ready |
| JSON-LD Structured Data | Blog only | BlogPosting + BreadcrumbList schemas |
| Canonical URLs | Root only | Configured via `alternates` |

---

## Gaps Identified

### High Priority

| Issue | Severity | File | Line |
|-------|----------|------|------|
| Blog posts missing canonical URL | Medium | `app/blog/[slug]/page.tsx` | 115-136 |
| Dashboard pages in sitemap | Medium | `app/sitemap.ts` | 94-114 |

### Medium Priority

| Issue | Severity | File | Line |
|-------|----------|------|------|
| Roadmap page missing OG/Twitter tags | Medium | `app/roadmap/page.tsx` | 5-8 |
| Contact page not in SEO defaults | Low | `lib/seo/metadata.ts` | 159-230 |

### Low Priority

| Issue | Severity | File | Notes |
|-------|----------|------|-------|
| Signup page has no metadata | Low | `app/signup/page.tsx` | Redirect page, but crawlers see it |
| No favicon.ico file | Low | `public/` | Uses webp icons only |

---

## Recommended Fixes

### 1. Add Canonical URLs to Blog Posts

**File:** `app/blog/[slug]/page.tsx`

Add to the return object in `generateMetadata`:

```typescript
alternates: {
  canonical: `https://www.socialcal.app/blog/${params.slug}`,
}
```

### 2. Remove Dashboard Pages from Sitemap

**File:** `app/sitemap.ts`

Remove lines 94-114 (dashboard pages). These are auth-protected and already disallowed in robots.txt.

### 3. Fix Roadmap Page Metadata

**File:** `app/roadmap/page.tsx`

Replace current metadata with:

```typescript
export const metadata: Metadata = {
  title: 'Feature Roadmap | SocialCal',
  description: 'See what we\'re building next. Vote on features and track our progress on the SocialCal product roadmap.',
  openGraph: {
    title: 'Feature Roadmap | SocialCal',
    description: 'See what we\'re building next. Vote on features and track our progress.',
    url: 'https://www.socialcal.app/roadmap',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Feature Roadmap | SocialCal',
    description: 'See what we\'re building next. Vote on features and track our progress.',
  },
  alternates: {
    canonical: 'https://www.socialcal.app/roadmap',
  },
}
```

### 4. Add Contact to SEO Defaults

**File:** `lib/seo/metadata.ts`

Add to `pathDefaults` object:

```typescript
'/contact': {
  ...defaultMetadata,
  title: 'Contact Us - SocialCal',
  description: 'Get in touch with the SocialCal team. We\'re here to help with questions about social media scheduling and management.',
  openGraph: {
    ...defaultMetadata.openGraph,
    title: 'Contact SocialCal',
    description: 'Get in touch with the SocialCal team.',
  },
},
```

### 5. Add favicon.ico (Optional)

Convert existing icon to .ico format and add to `public/favicon.ico`. Some older browsers and link previews require this format.

---

## Tracking & Monitoring Setup

### Must-Have (Pre-Launch)

| Tool | Purpose | Priority | Status |
|------|---------|----------|--------|
| Google Search Console | Index monitoring, crawl errors, sitemap submission | Critical | [ ] |
| Google Analytics 4 | Traffic analytics, user behavior | Critical | [ ] |
| Vercel Analytics | Performance, Core Web Vitals | High | [ ] |

#### Google Search Console Setup
1. Go to https://search.google.com/search-console
2. Add property: `https://www.socialcal.app`
3. Verify via DNS TXT record or HTML file
4. Submit sitemap: `https://www.socialcal.app/sitemap.xml`

#### Google Analytics 4 Setup
1. Create GA4 property at https://analytics.google.com
2. Get Measurement ID (G-XXXXXXXXXX)
3. Add to `app/layout.tsx`:

```typescript
import Script from 'next/script'

// In the component, before </head> or in <body>:
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('consent', 'default', {
      'analytics_storage': 'granted'
    });
    gtag('config', 'G-XXXXXXXXXX');
  `}
</Script>
```

### Should-Have (Week 1 Post-Launch)

| Tool | Purpose | Priority | Status |
|------|---------|----------|--------|
| Vercel Speed Insights | Core Web Vitals monitoring | High | [ ] |
| Uptime Monitor | Availability alerts | High | [ ] |
| Sentry | Error tracking | Medium | [ ] |

#### Uptime Monitoring Options (Free Tiers)
- **UptimeRobot** - 50 monitors free, 5-min checks
- **BetterStack** - 10 monitors free, 3-min checks
- **Pingdom** - 1 monitor free

### Nice-to-Have (Growth Phase)

| Tool | Purpose | Notes |
|------|---------|-------|
| Hotjar/FullStory | Session replays, heatmaps | User behavior insights |
| Plausible/Fathom | Privacy-focused analytics | GDPR-friendly alternative |
| Log drain | Production debugging | Vercel → Axiom/Logtail |

---

## Implementation Checklist

### SEO Fixes
- [x] Add canonical URLs to blog posts
- [x] Remove dashboard pages from sitemap
- [x] Fix roadmap page metadata
- [x] Add contact to SEO defaults
- [ ] Add favicon.ico to public/ (optional)

### Tracking Setup
- [x] Set up Google Search Console
- [x] Verify domain ownership
- [ ] Submit sitemap to GSC (just enter `sitemap.xml` and click Submit)
- [x] Add GA4 tracking snippet (G-GJ9QM1QNF8)
- [x] Enable Vercel Analytics
- [x] Enable Vercel Speed Insights
- [x] Set up uptime monitoring (UptimeRobot)
- [x] Add GA4 custom event tracking

### Events Tracked
| Event | Trigger |
|-------|---------|
| `login` | User logs in (email, google, magic_link) |
| `plan_selected` | User selects a pricing plan |
| `checkout_started` | User clicks "Start Free Trial" |
| `post_created` | Post published successfully |
| `post_scheduled` | Post scheduled for later |
| `account_connected` | Social account connected |
| `ai_suggestion_requested` | User generates AI captions |
| `ai_suggestion_used` | User selects an AI suggestion |

### Validation
- [ ] Test OG tags with https://www.opengraph.xyz/
- [ ] Test Twitter cards with https://cards-dev.twitter.com/validator
- [ ] Test structured data with https://search.google.com/test/rich-results
- [ ] Run Lighthouse audit (target: 90+ on all metrics)
- [ ] Verify sitemap is accessible at /sitemap.xml
- [ ] Verify robots.txt is accessible at /robots.txt

---

## Testing URLs

After fixes are deployed, validate with these tools:

| Tool | URL |
|------|-----|
| OG Tag Tester | https://www.opengraph.xyz/ |
| Twitter Card Validator | https://cards-dev.twitter.com/validator |
| Google Rich Results | https://search.google.com/test/rich-results |
| PageSpeed Insights | https://pagespeed.web.dev/ |
| Mobile-Friendly Test | https://search.google.com/test/mobile-friendly |

---

## Notes

- The signup page (`/signup`) redirects to homepage with modal - low priority for SEO since it's not a landing page
- Dashboard pages are already in robots.txt disallow list, but removing from sitemap is cleaner
- Consider adding Organization schema to homepage for brand recognition in search
