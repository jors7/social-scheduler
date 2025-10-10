import { useState, useEffect, useRef } from 'react'

interface AutoSaveOptions {
  interval?: number // milliseconds, default 30000 (30 seconds)
  enabled?: boolean
}

interface AutoSaveData {
  content: string
  platforms: string[]
  platformContent: Record<string, string>
  mediaUrls: string[]
}

export function useAutoSave(
  data: AutoSaveData,
  draftId: string | null,
  options: AutoSaveOptions = {}
) {
  const { interval = 30000, enabled = true } = options
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastDataRef = useRef<string>('')
  const draftIdRef = useRef<string | null>(draftId)

  // Update draft ID ref when it changes
  useEffect(() => {
    draftIdRef.current = draftId
  }, [draftId])

  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(async () => {
      // Check if data has changed
      const currentData = JSON.stringify(data)
      if (currentData === lastDataRef.current) return

      // Check if there's content to save
      if (!data.content && data.platforms.length === 0) return

      try {
        setIsSaving(true)
        setError(null)

        const currentDraftId = draftIdRef.current
        const endpoint = currentDraftId
          ? `/api/drafts?id=${currentDraftId}`
          : '/api/drafts'

        const method = currentDraftId ? 'PATCH' : 'POST'

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.content.slice(0, 50) || 'Untitled',
            content: data.content,
            platforms: data.platforms,
            platform_content: data.platformContent,
            media_urls: data.mediaUrls
          })
        })

        if (!response.ok) {
          throw new Error('Failed to auto-save')
        }

        const result = await response.json()

        // Update draft ID if this was a new draft
        if (!currentDraftId && result.draft?.id) {
          draftIdRef.current = result.draft.id
        }

        lastDataRef.current = currentData
        setLastSaved(new Date())

        // Store in localStorage as backup
        localStorage.setItem('autosave_backup', currentData)
        localStorage.setItem('autosave_timestamp', new Date().toISOString())
      } catch (err) {
        console.error('Auto-save error:', err)
        setError(err instanceof Error ? err.message : 'Auto-save failed')

        // Fallback to localStorage
        localStorage.setItem('autosave_backup', JSON.stringify(data))
        localStorage.setItem('autosave_timestamp', new Date().toISOString())
      } finally {
        setIsSaving(false)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [data, interval, enabled])

  // Helper function to get time ago string
  const getTimeAgo = () => {
    if (!lastSaved) return null

    const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000)

    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${seconds}s ago`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return {
    lastSaved,
    isSaving,
    error,
    timeAgo: getTimeAgo(),
    currentDraftId: draftIdRef.current
  }
}
