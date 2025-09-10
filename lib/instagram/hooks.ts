import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface InstagramMetrics {
  impressions: number
  reach: number
  saves: number
  profile_views: number
  follower_count: number
  engagement: number
  likes: number
  comments: number
  shares: number
}

interface InstagramUserInsights {
  impressions?: { value: number; previous?: number }
  reach?: { value: number; previous?: number }
  profile_views?: { value: number; previous?: number }
  follower_count?: { value: number; previous?: number }
}

interface InstagramMediaInsights {
  impressions: number
  reach: number
  saved: number
  likes: number
  comments: number
  shares: number
  engagement: number
  total_interactions: number
}

interface UseInstagramInsightsOptions {
  autoFetch?: boolean
  period?: 'day' | 'week' | 'days_28'
}

export function useInstagramUserInsights(options: UseInstagramInsightsOptions = {}) {
  const { autoFetch = true, period = 'week' } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [insights, setInsights] = useState<InstagramUserInsights | null>(null)

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/instagram/insights?type=user&period=${period}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch user insights')
      }
      
      const data = await response.json()
      setInsights(data.insights)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      console.error('Error fetching Instagram user insights:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    if (autoFetch) {
      fetchInsights()
    }
  }, [autoFetch, fetchInsights])

  return { insights, loading, error, refetch: fetchInsights }
}

export function useInstagramMediaInsights(mediaId: string | null, options: { autoFetch?: boolean } = {}) {
  const { autoFetch = false } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [insights, setInsights] = useState<InstagramMediaInsights | null>(null)

  const fetchInsights = useCallback(async () => {
    if (!mediaId) {
      setError(new Error('Media ID is required'))
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/instagram/insights?mediaId=${mediaId}&type=media`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch media insights')
      }
      
      const data = await response.json()
      
      if (data.insights) {
        const processed: InstagramMediaInsights = {
          impressions: data.insights.impressions?.value || 0,
          reach: data.insights.reach?.value || 0,
          saved: data.insights.saved?.value || 0,
          likes: data.insights.likes?.value || 0,
          comments: data.insights.comments?.value || 0,
          shares: data.insights.shares?.value || 0,
          engagement: data.insights.engagement?.value || 0,
          total_interactions: data.insights.total_interactions?.value || 0
        }
        setInsights(processed)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      console.error('Error fetching Instagram media insights:', error)
    } finally {
      setLoading(false)
    }
  }, [mediaId])

  useEffect(() => {
    if (autoFetch && mediaId) {
      fetchInsights()
    }
  }, [autoFetch, mediaId, fetchInsights])

  return { insights, loading, error, refetch: fetchInsights }
}

export function useInstagramStoryInsights(storyId: string | null, options: { autoFetch?: boolean } = {}) {
  const { autoFetch = false } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [insights, setInsights] = useState<any>(null)

  const fetchInsights = useCallback(async () => {
    if (!storyId) {
      setError(new Error('Story ID is required'))
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/instagram/insights?storyId=${storyId}&type=story`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch story insights')
      }
      
      const data = await response.json()
      setInsights(data.insights)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      console.error('Error fetching Instagram story insights:', error)
    } finally {
      setLoading(false)
    }
  }, [storyId])

  useEffect(() => {
    if (autoFetch && storyId) {
      fetchInsights()
    }
  }, [autoFetch, storyId, fetchInsights])

  return { insights, loading, error, refetch: fetchInsights }
}

export function useBatchInstagramInsights(mediaIds: string[]) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [insights, setInsights] = useState<Record<string, InstagramMediaInsights>>({})

  const fetchInsights = useCallback(async () => {
    if (mediaIds.length === 0) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/instagram/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch insights')
      }
      
      const data = await response.json()
      
      if (data.results) {
        const processedInsights: Record<string, InstagramMediaInsights> = {}
        
        data.results.forEach((result: any) => {
          if (result.success && result.insights) {
            processedInsights[result.mediaId] = {
              impressions: result.insights.impressions || 0,
              reach: result.insights.reach || 0,
              saved: result.insights.saved || 0,
              likes: result.insights.likes || 0,
              comments: result.insights.comments || 0,
              shares: result.insights.shares || 0,
              engagement: result.insights.engagement || 0,
              total_interactions: result.insights.total_interactions || 0
            }
          }
        })
        
        setInsights(processedInsights)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      console.error('Error fetching batch Instagram insights:', error)
      toast.error('Failed to load Instagram insights')
    } finally {
      setLoading(false)
    }
  }, [mediaIds])

  return { insights, loading, error, fetchInsights }
}

export function useInstagramConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accountInfo, setAccountInfo] = useState<any>(null)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/social-accounts')
        if (response.ok) {
          const accounts = await response.json()
          const instagramAccount = accounts.find(
            (acc: any) => acc.platform === 'instagram' && acc.is_active
          )
          
          if (instagramAccount) {
            setIsConnected(true)
            setAccountInfo(instagramAccount)
          } else {
            setIsConnected(false)
            setAccountInfo(null)
          }
        }
      } catch (error) {
        console.error('Error checking Instagram connection:', error)
        setIsConnected(false)
      } finally {
        setLoading(false)
      }
    }

    checkConnection()
  }, [])

  return { isConnected, loading, accountInfo }
}