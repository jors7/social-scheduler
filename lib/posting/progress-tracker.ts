import { toast } from 'sonner'

export type PostingStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'error'

export interface PlatformStatus {
  platform: string
  status: PostingStatus
  message?: string
  error?: string
}

export class PostingProgressTracker {
  private platforms: Map<string, PlatformStatus> = new Map()
  private toastId: string | number | undefined
  private startTime: number = Date.now()

  constructor(platforms: string[]) {
    // Initialize all platforms as pending
    platforms.forEach(platform => {
      this.platforms.set(platform, {
        platform,
        status: 'pending'
      })
    })
  }

  private getPlatformEmoji(platform: string): string {
    const emojis: Record<string, string> = {
      twitter: '𝕏',
      facebook: '📘',
      instagram: '📷',
      threads: '🧵',
      bluesky: '🦋',
      linkedin: '💼',
      pinterest: '📌',
      youtube: '📺',
      tiktok: '🎵'
    }
    return emojis[platform.toLowerCase()] || '📱'
  }

  private getStatusEmoji(status: PostingStatus): string {
    switch (status) {
      case 'uploading': return '📤'
      case 'processing': return '⏳'
      case 'success': return '✅'
      case 'error': return '❌'
      default: return '⭕'
    }
  }

  start() {
    const platformCount = this.platforms.size
    const platformNames = Array.from(this.platforms.keys()).map(p => 
      `${this.getPlatformEmoji(p)} ${p.charAt(0).toUpperCase() + p.slice(1)}`
    ).join(', ')
    
    this.toastId = toast.loading(
      `Starting to post to ${platformCount} platform${platformCount > 1 ? 's' : ''}...`,
      {
        description: platformNames,
        duration: Infinity
      }
    )
  }

  updatePlatform(platform: string, status: PostingStatus, message?: string, error?: string) {
    const platformStatus = this.platforms.get(platform)
    if (!platformStatus) return

    // Update the status
    platformStatus.status = status
    platformStatus.message = message
    platformStatus.error = error

    // Show individual platform toast based on status
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1)
    const emoji = this.getPlatformEmoji(platform)
    
    switch (status) {
      case 'uploading':
        toast.info(`${emoji} Uploading to ${platformName}...`, {
          duration: 2000
        })
        break
      case 'processing':
        let processingMsg = `${emoji} Processing ${platformName} post...`
        if (platform.toLowerCase() === 'instagram' && message?.includes('story')) {
          processingMsg = `${emoji} Processing ${platformName} story...`
        } else if (platform.toLowerCase() === 'instagram' && message?.includes('reel')) {
          processingMsg = `${emoji} Processing ${platformName} reel (this may take up to 2 minutes)...`
        } else if (platform.toLowerCase() === 'facebook' && message?.includes('story')) {
          processingMsg = `${emoji} Processing ${platformName} story...`
        }
        toast.info(processingMsg, {
          duration: 3000
        })
        break
      case 'success':
        // Use custom message if provided (e.g., for TikTok drafts)
        const successMessage = message
          ? `${emoji} ${message}`
          : `${emoji} Posted to ${platformName}!`;
        toast.success(successMessage, {
          duration: message ? 3000 : 2000 // Show custom messages a bit longer
        })
        break
      case 'error':
        toast.error(`${emoji} Failed to post to ${platformName}: ${error || 'Unknown error'}`, {
          duration: 4000
        })
        break
    }

    // Update main progress toast
    this.updateMainToast()
  }

  private updateMainToast() {
    const completed = Array.from(this.platforms.values()).filter(
      p => p.status === 'success' || p.status === 'error'
    )
    const successful = completed.filter(p => p.status === 'success')
    const failed = completed.filter(p => p.status === 'error')
    const inProgress = Array.from(this.platforms.values()).filter(
      p => p.status === 'uploading' || p.status === 'processing'
    )

    if (completed.length === this.platforms.size) {
      // All platforms completed
      this.finish()
    } else if (inProgress.length > 0) {
      // Some platforms still in progress
      const progressText = inProgress.map(p => {
        const emoji = this.getPlatformEmoji(p.platform)
        const statusEmoji = this.getStatusEmoji(p.status)
        return `${statusEmoji} ${emoji} ${p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}`
      }).join(', ')

      toast.loading(
        `Posting in progress... (${successful.length}/${this.platforms.size} completed)`,
        {
          id: this.toastId,
          description: progressText,
          duration: Infinity
        }
      )
    }
  }

  finish() {
    const successful = Array.from(this.platforms.values()).filter(p => p.status === 'success')
    const failed = Array.from(this.platforms.values()).filter(p => p.status === 'error')
    const elapsedTime = Math.round((Date.now() - this.startTime) / 1000)

    if (failed.length === 0) {
      // All successful
      toast.success(
        `Successfully posted to all ${successful.length} platform${successful.length > 1 ? 's' : ''}!`,
        {
          id: this.toastId,
          description: `Completed in ${elapsedTime} seconds`,
          duration: 4000
        }
      )
    } else if (successful.length === 0) {
      // All failed
      toast.error(
        'Failed to post to all platforms',
        {
          id: this.toastId,
          description: failed.map(p => `${this.getPlatformEmoji(p.platform)} ${p.platform}: ${p.error}`).join('\n'),
          duration: 6000
        }
      )
    } else {
      // Mixed results
      const successList = successful.map(p => 
        `${this.getPlatformEmoji(p.platform)} ${p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}`
      ).join(', ')
      
      toast.warning(
        `Posted to ${successful.length}/${this.platforms.size} platforms`,
        {
          id: this.toastId,
          description: `✅ Success: ${successList}\n❌ Failed: ${failed.length} platform${failed.length > 1 ? 's' : ''}`,
          duration: 5000
        }
      )
    }
  }

  // Helper to estimate time for slow platforms
  getEstimatedTime(platform: string, hasMedia: boolean): string | null {
    const estimates: Record<string, number> = {
      instagram_reel: 120, // 2 minutes
      instagram_image: 10,
      facebook_video: 30,
      youtube: 60,
      tiktok: 45,
      default: 5
    }

    const key = platform.toLowerCase() + (hasMedia ? '_image' : '')
    const seconds = estimates[key] || estimates.default
    
    if (seconds > 30) {
      const minutes = Math.ceil(seconds / 60)
      return `~${minutes} minute${minutes > 1 ? 's' : ''}`
    }
    
    return null
  }
}