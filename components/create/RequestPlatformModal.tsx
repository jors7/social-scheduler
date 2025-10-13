'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowUp, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlatformRequest {
  platform_name: string
  vote_count: number
  is_custom: boolean
}

interface RequestPlatformModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const suggestedPlatforms = [
  { name: 'Reddit', icon: '🤖', description: 'Share on communities' },
  { name: 'Snapchat', icon: '👻', description: 'Stories and Spotlight' },
  { name: 'Discord', icon: '💬', description: 'Server announcements' },
  { name: 'Mastodon', icon: '🐘', description: 'Decentralized social' },
  { name: 'Tumblr', icon: '📝', description: 'Blogging platform' },
  { name: 'WhatsApp', icon: '💚', description: 'Broadcast messages' },
  { name: 'Telegram', icon: '✈️', description: 'Channel posting' },
  { name: 'Medium', icon: '📰', description: 'Long-form articles' },
]

export function RequestPlatformModal({ open, onOpenChange }: RequestPlatformModalProps) {
  const [requests, setRequests] = useState<PlatformRequest[]>([])
  const [customRequest, setCustomRequest] = useState('')
  const [loadingVote, setLoadingVote] = useState<string | null>(null)
  const [loadingCustom, setLoadingCustom] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(true)

  // Load platform requests when modal opens
  useEffect(() => {
    if (open) {
      loadRequests()
    }
  }, [open])

  const loadRequests = async () => {
    setLoadingRequests(true)
    try {
      const response = await fetch('/api/platform-requests')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Error loading platform requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleVote = async (platformName: string) => {
    setLoadingVote(platformName)
    try {
      const response = await fetch('/api/platform-requests/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformName }),
      })

      if (response.ok) {
        toast.success(`Voted for ${platformName}!`)
        await loadRequests() // Reload to get updated counts
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to vote')
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Failed to vote')
    } finally {
      setLoadingVote(null)
    }
  }

  const handleCustomRequest = async () => {
    if (!customRequest.trim()) {
      toast.error('Please enter a platform name')
      return
    }

    setLoadingCustom(true)
    try {
      const response = await fetch('/api/platform-requests/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformName: customRequest.trim() }),
      })

      if (response.ok) {
        toast.success(`Request submitted for ${customRequest}!`)
        setCustomRequest('')
        await loadRequests()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit request')
      }
    } catch (error) {
      console.error('Error submitting custom request:', error)
      toast.error('Failed to submit request')
    } finally {
      setLoadingCustom(false)
    }
  }

  const getVoteCount = (platformName: string) => {
    const request = requests.find(r => r.platform_name.toLowerCase() === platformName.toLowerCase())
    return request?.vote_count || 0
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">🗳️</span>
            Request New Platform
          </DialogTitle>
          <DialogDescription>
            Vote for platforms you'd like to see or request a custom one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Popular Platforms Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>🌟</span>
              Popular Platforms
            </h3>

            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestedPlatforms.map((platform) => {
                  const votes = getVoteCount(platform.name)
                  const isVoting = loadingVote === platform.name

                  return (
                    <button
                      key={platform.name}
                      onClick={() => handleVote(platform.name)}
                      disabled={isVoting}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                        "border-gray-200 hover:border-green-300 hover:bg-green-50/50",
                        isVoting && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="text-2xl">{platform.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{platform.name}</p>
                        <p className="text-xs text-gray-500 truncate">{platform.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        {isVoting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <ArrowUp className="h-3 w-3" />
                            <span className="text-xs font-bold">{votes}</span>
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Custom Request Section */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>💡</span>
              Don't see your platform?
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="custom-platform" className="text-sm text-gray-700">
                  Request a custom platform
                </Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    id="custom-platform"
                    value={customRequest}
                    onChange={(e) => setCustomRequest(e.target.value)}
                    placeholder="e.g., Substack, Vimeo, WeChat..."
                    className="flex-1"
                    disabled={loadingCustom}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !loadingCustom) {
                        handleCustomRequest()
                      }
                    }}
                  />
                  <Button
                    onClick={handleCustomRequest}
                    disabled={loadingCustom || !customRequest.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loadingCustom ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                We'll review your request and consider adding it to our roadmap
              </p>
            </div>
          </div>

          {/* Custom Requests List */}
          {requests.some(r => r.is_custom) && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>📋</span>
                Community Requests
              </h3>
              <div className="space-y-2">
                {requests
                  .filter(r => r.is_custom)
                  .sort((a, b) => b.vote_count - a.vote_count)
                  .slice(0, 5)
                  .map((request) => (
                    <div
                      key={request.platform_name}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {request.platform_name}
                      </span>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-200 text-gray-700">
                        <ArrowUp className="h-3 w-3" />
                        <span className="text-xs font-bold">{request.vote_count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
