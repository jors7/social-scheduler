import { addDays, format, subDays } from 'date-fns'

export interface CaptionSuggestion {
  id: string
  content: string
  tone: 'professional' | 'casual' | 'funny' | 'inspiring' | 'educational'
  hashtags: string[]
  platforms: string[]
  characterCount: number
}

export interface SuggestionRequest {
  content?: string
  platforms: string[]
  tone?: string
  includeHashtags?: boolean
  includeEmojis?: boolean
}

// AI suggestion service with OpenAI integration
export class AICaptionService {
  private static templates = {
    professional: [
      "Excited to share this with you! {content}",
      "Here's what we've been working on: {content}",
      "Thrilled to announce: {content}",
      "We're proud to present: {content}",
      "Take a look at what we've accomplished: {content}"
    ],
    casual: [
      "Hey everyone! {content} 😊",
      "Just wanted to share this cool thing: {content}",
      "Check this out! {content}",
      "Loving this: {content}",
      "Had to share this with you all: {content}"
    ],
    funny: [
      "Plot twist: {content} 😂",
      "When life gives you lemons... {content} 🍋",
      "Breaking news: {content} (and yes, it's as awesome as it sounds)",
      "Fun fact: {content}",
      "Story time: {content}"
    ],
    inspiring: [
      "Remember: {content} ✨",
      "Today's motivation: {content}",
      "Believe in yourself: {content}",
      "Dream big: {content}",
      "You've got this: {content}"
    ],
    educational: [
      "Did you know? {content}",
      "Quick tip: {content}",
      "Here's what I learned: {content}",
      "Pro tip: {content}",
      "Knowledge share: {content}"
    ]
  }

  private static hashtags = {
    general: ['#socialmedia', '#content', '#digital', '#marketing', '#brand'],
    business: ['#business', '#entrepreneur', '#success', '#growth', '#innovation'],
    lifestyle: ['#lifestyle', '#inspiration', '#motivation', '#wellness', '#positivity'],
    technology: ['#tech', '#innovation', '#digital', '#future', '#startup'],
    creative: ['#creative', '#design', '#art', '#inspiration', '#photography']
  }

  private static platformEmojis = {
    instagram: ['🔥', '✨', '💫', '🌟', '💖', '🎉', '📸', '🎨'],
    twitter: ['🚀', '💡', '⚡', '🔥', '📢', '💭', '🧵', '👀'],
    linkedin: ['💼', '🚀', '📊', '💡', '🎯', '📈', '🤝', '⭐'],
    facebook: ['❤️', '😊', '🎉', '👥', '🌟', '💫', '🔥', '✨'],
    tiktok: ['🎵', '💃', '🕺', '🔥', '✨', '🎭', '🎬', '⚡'],
    youtube: ['🎬', '📹', '🔔', '👍', '🎯', '🚀', '💯', '🎥']
  }

  static async generateSuggestions(request: SuggestionRequest): Promise<CaptionSuggestion[]> {
    const { content = '', platforms, tone = 'casual', includeHashtags = true, includeEmojis = true } = request

    try {
      // Try OpenAI API route first
      if (content.trim()) {
        const response = await fetch('/api/ai-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            platforms,
            tone,
            includeHashtags,
            includeEmojis
          })
        })

        if (response.ok) {
          const data = await response.json()
          return data.suggestions
        }
      }
    } catch (error) {
      console.error('OpenAI API failed, falling back to mock data:', error)
    }

    // Fallback to mock suggestions
    return this.generateMockSuggestions(request)
  }

  private static async generateMockSuggestions(request: SuggestionRequest): Promise<CaptionSuggestion[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const { content = '', platforms, tone = 'casual', includeHashtags = true, includeEmojis = true } = request
    const suggestions: CaptionSuggestion[] = []

    // Generate suggestions for each tone
    const tones: Array<keyof typeof this.templates> = tone === 'mixed' 
      ? ['professional', 'casual', 'funny', 'inspiring', 'educational']
      : [tone as keyof typeof this.templates]

    tones.forEach((currentTone, index) => {
      const templates = this.templates[currentTone]
      const template = templates[Math.floor(Math.random() * templates.length)]
      
      let suggestion = template.replace('{content}', content || 'something amazing')
      
      // Add emojis based on platform
      if (includeEmojis && platforms.length > 0) {
        const platformEmojis = this.platformEmojis[platforms[0] as keyof typeof this.platformEmojis] || []
        const emoji = platformEmojis[Math.floor(Math.random() * platformEmojis.length)]
        if (emoji && !suggestion.includes(emoji)) {
          suggestion += ` ${emoji}`
        }
      }

      // Add hashtags
      let hashtags: string[] = []
      if (includeHashtags) {
        const hashtagCategories = Object.values(this.hashtags)
        const randomCategory = hashtagCategories[Math.floor(Math.random() * hashtagCategories.length)]
        hashtags = randomCategory.slice(0, 3 + Math.floor(Math.random() * 3))
      }

      suggestions.push({
        id: `suggestion-${currentTone}-${index}`,
        content: suggestion,
        tone: currentTone,
        hashtags,
        platforms,
        characterCount: suggestion.length + hashtags.join(' ').length
      })
    })

    // Add platform-specific optimizations
    platforms.forEach(platform => {
      const optimizedSuggestion = this.optimizeForPlatform(suggestions[0], platform)
      if (optimizedSuggestion.content !== suggestions[0].content) {
        suggestions.push(optimizedSuggestion)
      }
    })

    return suggestions.slice(0, 5) // Return top 5 suggestions
  }

  private static optimizeForPlatform(baseSuggestion: CaptionSuggestion, platform: string): CaptionSuggestion {
    let optimizedContent = baseSuggestion.content
    let optimizedHashtags = [...baseSuggestion.hashtags]

    switch (platform) {
      case 'twitter':
        // Keep it short and punchy
        optimizedContent = optimizedContent.length > 200 
          ? optimizedContent.substring(0, 200) + '...' 
          : optimizedContent
        optimizedHashtags = optimizedHashtags.slice(0, 2) // Twitter works better with fewer hashtags
        break
        
      case 'instagram':
        // Instagram loves hashtags and emojis
        if (optimizedHashtags.length < 5) {
          optimizedHashtags.push(...this.hashtags.lifestyle.slice(0, 5 - optimizedHashtags.length))
        }
        break
        
      case 'linkedin':
        // More professional tone
        optimizedContent = optimizedContent.replace(/😊|😂|🔥/g, '')
        optimizedHashtags = optimizedHashtags.filter(tag => 
          this.hashtags.business.includes(tag) || this.hashtags.general.includes(tag)
        )
        break
        
      case 'tiktok':
        // Add trending elements
        if (!optimizedContent.includes('#')) {
          optimizedContent += ' #fyp #viral'
        }
        break
    }

    return {
      ...baseSuggestion,
      id: `${baseSuggestion.id}-${platform}`,
      content: optimizedContent,
      hashtags: optimizedHashtags,
      platforms: [platform],
      characterCount: optimizedContent.length + optimizedHashtags.join(' ').length
    }
  }

  static async generateHashtagSuggestions(content: string, platforms: string[]): Promise<string[]> {
    try {
      // Try OpenAI API route first
      if (content.trim()) {
        const response = await fetch('/api/ai-hashtags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            platforms
          })
        })

        if (response.ok) {
          const data = await response.json()
          return data.hashtags
        }
      }
    } catch (error) {
      console.error('OpenAI hashtag API failed, falling back to mock data:', error)
    }

    // Fallback to mock hashtag generation
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const allHashtags = Object.values(this.hashtags).flat()
    const suggestions = []
    
    // Add content-based hashtags (mock analysis)
    if (content.toLowerCase().includes('business') || content.toLowerCase().includes('work')) {
      suggestions.push(...this.hashtags.business.slice(0, 3))
    }
    if (content.toLowerCase().includes('creative') || content.toLowerCase().includes('design')) {
      suggestions.push(...this.hashtags.creative.slice(0, 3))
    }
    if (content.toLowerCase().includes('tech') || content.toLowerCase().includes('digital')) {
      suggestions.push(...this.hashtags.technology.slice(0, 3))
    }
    
    // Add general suggestions
    suggestions.push(...this.hashtags.general.slice(0, 2))
    
    // Remove duplicates and return
    return [...new Set(suggestions)].slice(0, 10)
  }

  static getPopularHashtags(platform: string): string[] {
    const platformHashtags = {
      instagram: ['#instagood', '#photooftheday', '#love', '#beautiful', '#happy', '#picoftheday'],
      twitter: ['#trending', '#breaking', '#news', '#update', '#follow', '#retweet'],
      linkedin: ['#professional', '#networking', '#career', '#business', '#leadership', '#growth'],
      tiktok: ['#fyp', '#viral', '#trending', '#foryou', '#challenge', '#dance'],
      facebook: ['#like', '#share', '#follow', '#community', '#friends', '#family']
    }
    
    return platformHashtags[platform as keyof typeof platformHashtags] || platformHashtags.instagram
  }
}