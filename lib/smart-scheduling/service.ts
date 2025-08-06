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

interface SmartScheduleOptions {
  platforms: string[]
  startDate?: Date
  endDate?: Date
  minInterval?: number // minutes between posts
  avoidWeekends?: boolean
  businessHoursOnly?: boolean
  userTimezone?: string
}

interface ScheduleSuggestion {
  datetime: Date
  platform: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
  score: number
}

const DEFAULT_OPTIMAL_TIMES = {
  // Fallback times when no data is available (based on general best practices)
  facebook: [
    { hour: 9, dayOfWeek: 2, score: 80 }, // Tuesday 9 AM
    { hour: 15, dayOfWeek: 3, score: 85 }, // Wednesday 3 PM
    { hour: 10, dayOfWeek: 4, score: 75 }, // Thursday 10 AM
  ],
  bluesky: [
    { hour: 8, dayOfWeek: 2, score: 70 }, // Tuesday 8 AM
    { hour: 12, dayOfWeek: 3, score: 75 }, // Wednesday 12 PM
    { hour: 17, dayOfWeek: 1, score: 65 }, // Monday 5 PM
  ],
  twitter: [
    { hour: 9, dayOfWeek: 2, score: 80 },
    { hour: 12, dayOfWeek: 3, score: 75 },
    { hour: 15, dayOfWeek: 4, score: 70 },
  ],
  instagram: [
    { hour: 11, dayOfWeek: 2, score: 85 },
    { hour: 14, dayOfWeek: 4, score: 80 },
    { hour: 17, dayOfWeek: 5, score: 75 },
  ],
  linkedin: [
    { hour: 8, dayOfWeek: 2, score: 90 }, // Tuesday 8 AM
    { hour: 12, dayOfWeek: 3, score: 85 }, // Wednesday 12 PM
    { hour: 17, dayOfWeek: 4, score: 80 }, // Thursday 5 PM
  ]
}

export class SmartSchedulingService {
  private optimalTimes: PlatformOptimalTimes = {}
  private defaultMinInterval = 120 // 2 hours between posts by default

  async loadOptimalTimes(userId?: string): Promise<void> {
    try {
      // In a real implementation, this would fetch from your API
      // For now, we'll use default times
      if (userId) {
        const response = await fetch(`/api/analytics/optimal-times?days=90`)
        if (response.ok) {
          const data = await response.json()
          this.optimalTimes = data.optimalTimes
        }
      }
      
      // Fall back to defaults if no data available
      if (Object.keys(this.optimalTimes).length === 0) {
        console.log('Using default optimal times')
        this.optimalTimes = DEFAULT_OPTIMAL_TIMES
      }
    } catch (error) {
      console.error('Failed to load optimal times, using defaults:', error)
      this.optimalTimes = DEFAULT_OPTIMAL_TIMES
    }
  }

  getSuggestedTimes(options: SmartScheduleOptions): ScheduleSuggestion[] {
    const suggestions: ScheduleSuggestion[] = []
    const now = new Date()
    const startDate = options.startDate || new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    const endDate = options.endDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    const minInterval = options.minInterval || this.defaultMinInterval

    // Get optimal times for each platform
    const platformTimes: { [platform: string]: OptimalTime[] } = {}
    
    options.platforms.forEach(platform => {
      platformTimes[platform] = this.optimalTimes[platform] || []
    })

    // Generate suggestions for the next 7 days
    const suggestions7Days: ScheduleSuggestion[] = []
    const currentDate = new Date(startDate)
    
    for (let day = 0; day < 7; day++) {
      const dayOfWeek = currentDate.getDay()
      
      // Skip weekends if requested
      if (options.avoidWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      // Check each platform for optimal times on this day
      options.platforms.forEach(platform => {
        const platformOptimalTimes = platformTimes[platform] || []
        
        // Find optimal times for this day of week
        const dayOptimalTimes = platformOptimalTimes.filter(time => time.dayOfWeek === dayOfWeek)
        
        if (dayOptimalTimes.length > 0) {
          // Use the best time for this day
          const bestTime = dayOptimalTimes[0]
          const suggestionDateTime = new Date(currentDate)
          suggestionDateTime.setHours(bestTime.hour, 0, 0, 0)
          
          // Skip if it's in the past
          if (suggestionDateTime > now && suggestionDateTime >= startDate && suggestionDateTime <= endDate) {
            // Check business hours if requested
            if (options.businessHoursOnly) {
              if (bestTime.hour < 9 || bestTime.hour > 17) {
                // Move to business hours (10 AM as safe default)
                suggestionDateTime.setHours(10, 0, 0, 0)
              }
            }

            const confidence = this.calculateConfidence(bestTime)
            const reason = this.generateReason(platform, bestTime, dayOfWeek)

            suggestions7Days.push({
              datetime: suggestionDateTime,
              platform,
              confidence,
              reason,
              score: bestTime.score
            })
          }
        } else {
          // No data for this platform/day, use fallback
          const fallbackHour = this.getFallbackHour(platform, dayOfWeek, options.businessHoursOnly)
          const suggestionDateTime = new Date(currentDate)
          suggestionDateTime.setHours(fallbackHour, 0, 0, 0)
          
          if (suggestionDateTime > now && suggestionDateTime >= startDate && suggestionDateTime <= endDate) {
            suggestions7Days.push({
              datetime: suggestionDateTime,
              platform,
              confidence: 'low',
              reason: `Best practice time for ${platform}`,
              score: 50
            })
          }
        }
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Sort by score and apply minimum interval
    suggestions7Days.sort((a, b) => b.score - a.score)
    
    // Apply minimum interval constraint
    const finalSuggestions: ScheduleSuggestion[] = []
    let lastScheduledTime: Date | null = null

    suggestions7Days.forEach(suggestion => {
      if (!lastScheduledTime || 
          suggestion.datetime.getTime() - lastScheduledTime.getTime() >= minInterval * 60 * 1000) {
        finalSuggestions.push(suggestion)
        lastScheduledTime = suggestion.datetime
      }
    })

    return finalSuggestions.slice(0, 10) // Return top 10 suggestions
  }

  getNextOptimalTime(platform: string, afterDate?: Date): Date | null {
    const now = afterDate || new Date()
    const optimalTimes = this.optimalTimes[platform] || []
    
    if (optimalTimes.length === 0) {
      // Return a reasonable default (next Tuesday at 10 AM)
      const nextTuesday = new Date(now)
      const daysUntilTuesday = (2 - now.getDay() + 7) % 7
      nextTuesday.setDate(now.getDate() + daysUntilTuesday)
      nextTuesday.setHours(10, 0, 0, 0)
      return nextTuesday
    }

    // Find the next occurrence of the best time
    const bestTime = optimalTimes[0]
    const targetDate = new Date(now)
    
    // Calculate days until target day of week
    const daysUntil = (bestTime.dayOfWeek - now.getDay() + 7) % 7
    targetDate.setDate(now.getDate() + daysUntil)
    targetDate.setHours(bestTime.hour, 0, 0, 0)
    
    // If it's today but the time has passed, move to next week
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 7)
    }
    
    return targetDate
  }

  private calculateConfidence(optimalTime: OptimalTime): 'high' | 'medium' | 'low' {
    if (optimalTime.postCount >= 5 && optimalTime.score > 70) {
      return 'high'
    } else if (optimalTime.postCount >= 3 && optimalTime.score > 50) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  private generateReason(platform: string, time: OptimalTime, dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = days[dayOfWeek]
    const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour
    const ampm = time.hour >= 12 ? 'PM' : 'AM'
    
    if (time.postCount >= 5) {
      return `Your ${platform} posts perform best on ${dayName}s at ${hour12} ${ampm} (${time.postCount} posts analyzed)`
    } else if (time.postCount >= 3) {
      return `Good performance on ${platform} at ${hour12} ${ampm} on ${dayName}s (${time.postCount} posts)`
    } else {
      return `Optimal time based on ${platform} best practices`
    }
  }

  private getFallbackHour(platform: string, dayOfWeek: number, businessHoursOnly?: boolean): number {
    // General best practice times
    const fallbackTimes = {
      facebook: dayOfWeek === 2 ? 15 : 10, // Wednesday 3PM, others 10AM
      bluesky: dayOfWeek === 3 ? 12 : 9,   // Thursday 12PM, others 9AM
      twitter: dayOfWeek === 2 ? 9 : 12,   // Tuesday 9AM, others 12PM
      instagram: dayOfWeek === 4 ? 14 : 11, // Thursday 2PM, others 11AM
      linkedin: dayOfWeek < 5 ? 8 : 12,    // Weekdays 8AM, weekends 12PM
    }
    
    const defaultHour = fallbackTimes[platform as keyof typeof fallbackTimes] || 10
    
    if (businessHoursOnly && (defaultHour < 9 || defaultHour > 17)) {
      return 10 // Safe default during business hours
    }
    
    return defaultHour
  }
}

export const smartSchedulingService = new SmartSchedulingService()