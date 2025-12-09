import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Function to ping search engines about sitemap updates
async function pingSitemapToSearchEngines() {
  const sitemapUrl = 'https://www.socialcal.app/sitemap.xml'
  const results = {
    google: false,
    bing: false,
    yandex: false,
    indexnow: false
  }
  
  try {
    // Ping Google
    const googleResponse = await fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      { method: 'GET' }
    )
    results.google = googleResponse.ok
  } catch (error) {
    console.error('Failed to ping Google:', error)
  }
  
  try {
    // Ping Bing
    const bingResponse = await fetch(
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      { method: 'GET' }
    )
    results.bing = bingResponse.ok
  } catch (error) {
    console.error('Failed to ping Bing:', error)
  }
  
  try {
    // Ping Yandex (optional - mainly for international SEO)
    const yandexResponse = await fetch(
      `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      { method: 'GET' }
    )
    results.yandex = yandexResponse.ok
  } catch (error) {
    console.error('Failed to ping Yandex:', error)
  }
  
  // IndexNow - instantly index with Bing and Yandex
  // You'll need to add an IndexNow key file to your public directory
  try {
    const indexNowKey = process.env.INDEXNOW_KEY || 'your-indexnow-key'
    const indexNowResponse = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        host: 'www.socialcal.app',
        key: indexNowKey,
        keyLocation: `https://www.socialcal.app/${indexNowKey}.txt`,
        urlList: [
          'https://www.socialcal.app/',
          'https://www.socialcal.app/pricing',
          'https://www.socialcal.app/blog'
        ]
      })
    })
    results.indexnow = indexNowResponse.ok
  } catch (error) {
    console.error('Failed to use IndexNow:', error)
  }
  
  return results
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // SECURITY FIX: Require admin authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'jan.orsula1@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    // Get trigger source from request body
    const body = await request.json().catch(() => ({}))
    const { source = 'manual' } = body

    // Ping search engines
    const results = await pingSitemapToSearchEngines()

    console.log('Sitemap pinged by admin:', {
      source,
      results,
      timestamp: new Date().toISOString()
    })

    // Count successful pings
    const successCount = Object.values(results).filter(Boolean).length
    const totalCount = Object.keys(results).length

    return NextResponse.json({
      success: successCount > 0,
      message: `Successfully pinged ${successCount}/${totalCount} search engines`,
      results,
      source,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error pinging sitemap:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to ping sitemap',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check last ping status
export async function GET(request: NextRequest) {
  try {
    // Return sitemap URL and instructions
    return NextResponse.json({
      sitemap_url: 'https://www.socialcal.app/sitemap.xml',
      last_modified: new Date().toISOString(),
      instructions: {
        google: 'Submit via Google Search Console or ping endpoint',
        bing: 'Submit via Bing Webmaster Tools or ping endpoint',
        ping_endpoint: 'POST /api/sitemap/ping to notify search engines'
      },
      search_console_urls: {
        google: 'https://search.google.com/search-console',
        bing: 'https://www.bing.com/webmasters',
        yandex: 'https://webmaster.yandex.com'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get sitemap info' },
      { status: 500 }
    )
  }
}