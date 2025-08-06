import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface PostPerformance {
  posted_at: string
  platform: string
  engagement: number
  reach: number
  hour: number
  dayOfWeek: number
}

interface OptimalTime {
  hour: number
  dayOfWeek: number
  avgEngagement: number
  postCount: number
  score: number
}

interface PlatformOptimalTimes {
  [platform: string]: OptimalTime[]
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') // Optional: filter by platform
    const days = parseInt(searchParams.get('days') || '90') // Default: last 90 days

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    console.log('Fetching optimal times analysis for user:', user.id)

    // Fetch posted posts with engagement data
    const { data: posts, error } = await supabase
      .from('scheduled_posts')
      .select('posted_at, post_results, platforms')
      .eq('user_id', user.id)
      .eq('status', 'posted')
      .not('post_results', 'is', null)
      .gte('posted_at', startDate.toISOString())
      .lte('posted_at', endDate.toISOString())

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        message: 'No posted content found for analysis',
        optimalTimes: {},
        summary: {
          totalPosts: 0,
          daysAnalyzed: days,
          platforms: []
        }
      })
    }

    console.log(`Analyzing ${posts.length} posts`)

    // Parse and aggregate performance data
    const performanceData: PostPerformance[] = []
    
    posts.forEach(post => {
      if (post.post_results && Array.isArray(post.post_results)) {
        post.post_results.forEach((result: any) => {
          if (result.success && result.data && result.data.metrics) {
            const postedDate = new Date(post.posted_at)
            const metrics = result.data.metrics
            
            const engagement = (metrics.likes || 0) + 
                            (metrics.comments || 0) + 
                            (metrics.shares || 0)
            const reach = metrics.views || metrics.impressions || 0

            // Only include if we have meaningful engagement data
            if (engagement > 0 || reach > 0) {
              performanceData.push({
                posted_at: post.posted_at,
                platform: result.platform,
                engagement,
                reach,
                hour: postedDate.getHours(),
                dayOfWeek: postedDate.getDay() // 0 = Sunday
              })
            }
          }
        })
      }
    })

    console.log(`Processed ${performanceData.length} performance data points`)

    if (performanceData.length === 0) {
      return NextResponse.json({
        message: 'No engagement data found for analysis',
        optimalTimes: {},
        summary: {
          totalPosts: posts.length,
          daysAnalyzed: days,
          platforms: []
        }
      })
    }

    // Group by platform and time slots
    const platformAnalysis: PlatformOptimalTimes = {}
    const platformsSet = new Set<string>()

    // Initialize time slots for each platform
    performanceData.forEach(data => {
      platformsSet.add(data.platform)
      
      if (!platformAnalysis[data.platform]) {
        platformAnalysis[data.platform] = []
      }
    })

    // Analyze each platform
    Object.keys(platformAnalysis).forEach(platformName => {
      // Filter data for this platform
      const platformData = performanceData.filter(d => d.platform === platformName)
      
      // Group by hour and day of week
      const timeSlots: { [key: string]: { engagements: number[], reaches: number[] } } = {}
      
      platformData.forEach(data => {
        const key = `${data.hour}-${data.dayOfWeek}`
        if (!timeSlots[key]) {
          timeSlots[key] = { engagements: [], reaches: [] }
        }
        timeSlots[key].engagements.push(data.engagement)
        timeSlots[key].reaches.push(data.reach)
      })

      // Calculate optimal times
      const optimalTimes: OptimalTime[] = []
      
      Object.entries(timeSlots).forEach(([key, data]) => {
        const [hour, dayOfWeek] = key.split('-').map(Number)
        const avgEngagement = data.engagements.reduce((a, b) => a + b, 0) / data.engagements.length
        const avgReach = data.reaches.reduce((a, b) => a + b, 0) / data.reaches.length
        const postCount = data.engagements.length

        // Calculate score (weighted average of engagement and reach, with bonus for consistency)
        const consistencyBonus = Math.min(postCount / 5, 2) // Up to 2x bonus for 5+ posts in this slot
        const score = (avgEngagement * 0.7 + avgReach * 0.3) * consistencyBonus

        optimalTimes.push({
          hour,
          dayOfWeek,
          avgEngagement,
          postCount,
          score
        })
      })

      // Sort by score and keep top times
      platformAnalysis[platformName] = optimalTimes
        .sort((a, b) => b.score - a.score)
        .slice(0, 10) // Keep top 10 time slots
    })

    // Filter by platform if requested
    const filteredAnalysis = platform && platformAnalysis[platform] 
      ? { [platform]: platformAnalysis[platform] }
      : platformAnalysis

    return NextResponse.json({
      optimalTimes: filteredAnalysis,
      summary: {
        totalPosts: posts.length,
        performanceDataPoints: performanceData.length,
        daysAnalyzed: days,
        platforms: Array.from(platformsSet),
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    })

  } catch (error) {
    console.error('Optimal times analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}