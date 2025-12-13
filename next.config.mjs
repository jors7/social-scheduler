/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },

  // Remove X-Powered-By header (information disclosure)
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable HSTS (force HTTPS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions policy (restrict browser features)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + inline (needed for Next.js) + specific domains
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com",
              // Styles: self + inline (needed for Tailwind/styled components)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: self + data URIs + blob + external image sources
              "img-src 'self' data: blob: https: http:",
              // Fonts: self + Google Fonts
              "font-src 'self' https://fonts.gstatic.com data:",
              // Connect: API calls
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.openai.com https://*.upstash.io https://*.threads.net https://*.facebook.com https://graph.facebook.com https://bsky.social https://*.bsky.network https://vitals.vercel-insights.com https://vercel.live https://va.vercel-scripts.com https://*.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
              // Frames: Stripe checkout
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://vercel.live",
              // Frame ancestors (prevent clickjacking)
              "frame-ancestors 'self'",
              // Form submissions
              "form-action 'self'",
              // Base URI
              "base-uri 'self'",
              // Object/embed (disable Flash, etc.)
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig