import { addDays, format, subDays } from 'date-fns'

export interface AnalyticsData {
  totalPosts: number
  totalEngagement: number
  totalReach: number
  totalImpressions: number
  engagementRate: number
  topPlatform: string
}

export interface EngagementData {
  date: string
  likes: number
  comments: number
  shares: number
  total: number
}

export interface PlatformData {
  platform: string
  posts: number
  engagement: number
  reach: number
  color: string
  icon: string
}

export interface ReachData {
  date: string
  reach: number
  impressions: number
}

export interface TopPost {
  id: string
  content: string
  platform: string
  engagement: number
  reach: number
  date: string
  type: 'text' | 'image' | 'video'
}

// Generate mock data
const generateDateRange = (days: number) => {
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    dates.push(format(subDays(new Date(), i), 'MMM dd'))
  }
  return dates
}

export const getAnalyticsOverview = (): AnalyticsData => ({
  totalPosts: 847,
  totalEngagement: 12450,
  totalReach: 98700,
  totalImpressions: 234500,
  engagementRate: 5.8,
  topPlatform: 'Instagram'
})

export const getEngagementData = (days: number = 30): EngagementData[] => {
  const dates = generateDateRange(days)
  return dates.map(date => ({
    date,
    likes: Math.floor(Math.random() * 500) + 100,
    comments: Math.floor(Math.random() * 100) + 20,
    shares: Math.floor(Math.random() * 80) + 10,
    total: 0
  })).map(item => ({
    ...item,
    total: item.likes + item.comments + item.shares
  }))
}

export const getPlatformData = (): PlatformData[] => [
  {
    platform: 'Instagram',
    posts: 284,
    engagement: 4580,
    reach: 34200,
    color: '#E4405F',
    icon: '📷'
  },
  {
    platform: 'Twitter',
    posts: 156,
    engagement: 2340,
    reach: 18700,
    color: '#1DA1F2',
    icon: '🐦'
  },
  {
    platform: 'Facebook',
    posts: 98,
    engagement: 1890,
    reach: 15600,
    color: '#4267B2',
    icon: '👥'
  },
  {
    platform: 'LinkedIn',
    posts: 67,
    engagement: 1240,
    reach: 12400,
    color: '#0077B5',
    icon: '💼'
  },
  {
    platform: 'TikTok',
    posts: 142,
    engagement: 2400,
    reach: 17800,
    color: '#000000',
    icon: '🎵'
  },
  {
    platform: 'YouTube',
    posts: 23,
    engagement: 890,
    reach: 8900,
    color: '#FF0000',
    icon: '📹'
  }
]

export const getReachData = (days: number = 30): ReachData[] => {
  const dates = generateDateRange(days)
  return dates.map(date => ({
    date,
    reach: Math.floor(Math.random() * 5000) + 2000,
    impressions: Math.floor(Math.random() * 12000) + 5000
  }))
}

export const getTopPosts = (): TopPost[] => [
  {
    id: '1',
    content: 'Just launched our new product line! 🚀 What do you think?',
    platform: 'Instagram',
    engagement: 1240,
    reach: 8500,
    date: '2 days ago',
    type: 'image'
  },
  {
    id: '2',
    content: 'Behind the scenes of our latest campaign. The team worked so hard!',
    platform: 'Twitter',
    engagement: 890,
    reach: 6200,
    date: '5 days ago',
    type: 'video'
  },
  {
    id: '3',
    content: 'Pro tip: Always schedule your posts for optimal engagement times.',
    platform: 'LinkedIn',
    engagement: 567,
    reach: 4300,
    date: '1 week ago',
    type: 'text'
  },
  {
    id: '4',
    content: 'Check out this amazing transformation! Before and after pics.',
    platform: 'Facebook',
    engagement: 445,
    reach: 3800,
    date: '1 week ago',
    type: 'image'
  },
  {
    id: '5',
    content: 'Quick tutorial on how to maximize your social media ROI',
    platform: 'TikTok',
    engagement: 334,
    reach: 2900,
    date: '2 weeks ago',
    type: 'video'
  }
]

export const getPlatformColors = (platform: string): string => {
  const colors: Record<string, string> = {
    'Instagram': '#E4405F',
    'Twitter': '#1DA1F2',
    'Facebook': '#4267B2',
    'LinkedIn': '#0077B5',
    'TikTok': '#000000',
    'YouTube': '#FF0000',
    'Threads': '#000000',
    'Bluesky': '#0085ff',
    'Pinterest': '#BD081C'
  }
  return colors[platform] || '#6B7280'
}