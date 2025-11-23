'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  ArrowUp,
  Check,
  Calendar,
  Filter,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeatureRequest, FeatureCategory } from '@/lib/feature-requests/types'
import {
  FEATURE_CATEGORIES,
  getCategoryConfig,
  getStatusConfig
} from '@/lib/feature-requests/constants'

type RoadmapSection = 'in_progress' | 'planned' | 'completed'

export default function RoadmapPageClient() {
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [votedFeatures, setVotedFeatures] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all')
  const [activeSection, setActiveSection] = useState<RoadmapSection | 'all'>('all')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    loadRoadmap()
  }, [selectedCategory])

  const loadRoadmap = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      // Only show relevant statuses for roadmap (in_progress, planned, completed)
      // We'll filter client-side for better UX

      const response = await fetch(`/api/feature-requests?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
        setVotedFeatures(data.votedFeatures || [])
        setIsAuthenticated(true)
      } else if (response.status === 401) {
        // Not authenticated - still show roadmap but without voting
        const publicResponse = await fetch(`/api/feature-requests?${params}`)
        if (publicResponse.ok) {
          const data = await publicResponse.json()
          setRequests(data.requests || [])
        }
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Error loading roadmap:', error)
      toast.error('Failed to load roadmap')
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (featureId: string) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to vote on features')
      return
    }

    try {
      const response = await fetch('/api/feature-requests/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        await loadRoadmap()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to vote')
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Failed to vote')
    }
  }

  // Filter requests by roadmap sections
  const inProgressFeatures = requests.filter(r => r.status === 'in_progress')
  const plannedFeatures = requests.filter(r => r.status === 'planned')
  const completedFeatures = requests.filter(r => r.status === 'completed').slice(0, 10) // Latest 10

  const getFilteredFeatures = (features: FeatureRequest[]) => {
    return features.sort((a, b) => b.vote_count - a.vote_count)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-4xl">🚀</span>
                Product Roadmap
              </h1>
              <p className="text-gray-600 mt-2">See what we&apos;re building and vote on features you want</p>
            </div>
            <div className="flex gap-3">
              <Link href="/">
                <Button variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button>
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button>
                    Sign In to Vote
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as FeatureCategory | 'all')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {FEATURE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Jump to Section
            </label>
            <select
              value={activeSection}
              onChange={(e) => {
                const value = e.target.value as RoadmapSection | 'all'
                setActiveSection(value)
                if (value !== 'all') {
                  document.getElementById(`section-${value}`)?.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sections</option>
              <option value="in_progress">🚧 Now (In Progress)</option>
              <option value="planned">📋 Next (Planned)</option>
              <option value="completed">✅ Completed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-12">
            {/* In Progress Section */}
            <section id="section-in_progress">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-3xl">🚧</span>
                  Now - In Active Development
                </h2>
                <p className="text-gray-600 mt-1">Features currently being built by our team</p>
              </div>

              {inProgressFeatures.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">No features currently in development</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getFilteredFeatures(inProgressFeatures).map(feature => (
                    <FeatureCard
                      key={feature.id}
                      feature={feature}
                      hasVoted={votedFeatures.includes(feature.id)}
                      onVote={handleVote}
                      isAuthenticated={isAuthenticated}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Planned Section */}
            <section id="section-planned">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-3xl">📋</span>
                  Next - On Our Roadmap
                </h2>
                <p className="text-gray-600 mt-1">Features we&apos;ve committed to building soon</p>
              </div>

              {plannedFeatures.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">No features currently planned</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getFilteredFeatures(plannedFeatures).map(feature => (
                    <FeatureCard
                      key={feature.id}
                      feature={feature}
                      hasVoted={votedFeatures.includes(feature.id)}
                      onVote={handleVote}
                      isAuthenticated={isAuthenticated}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Completed Section */}
            <section id="section-completed">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-3xl">✅</span>
                  Recently Completed
                </h2>
                <p className="text-gray-600 mt-1">Features we&apos;ve shipped recently</p>
              </div>

              {completedFeatures.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">No completed features yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getFilteredFeatures(completedFeatures).map(feature => (
                    <FeatureCard
                      key={feature.id}
                      feature={feature}
                      hasVoted={votedFeatures.includes(feature.id)}
                      onVote={handleVote}
                      isAuthenticated={isAuthenticated}
                      showCompletedDate
                    />
                  ))}
                </div>
              )}
            </section>

            {/* CTA Section */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="text-center py-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Don&apos;t see your feature?
                </h3>
                <p className="text-gray-600 mb-6">
                  We&apos;d love to hear your ideas! Submit a feature request and vote on what matters most to you.
                </p>
                {isAuthenticated ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                      Request a Feature
                    </Button>
                  </Link>
                ) : (
                  <Link href="/signup">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                      Sign Up to Request Features
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// Feature Card Component
interface FeatureCardProps {
  feature: FeatureRequest
  hasVoted: boolean
  onVote: (id: string) => void
  isAuthenticated: boolean
  showCompletedDate?: boolean
}

function FeatureCard({ feature, hasVoted, onVote, isAuthenticated, showCompletedDate }: FeatureCardProps) {
  const [isVoting, setIsVoting] = useState(false)
  const categoryConfig = getCategoryConfig(feature.category)
  const statusConfig = getStatusConfig(feature.status)

  const handleVote = async () => {
    if (!isAuthenticated || hasVoted || isVoting) return
    setIsVoting(true)
    try {
      await onVote(feature.id)
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      hasVoted && "border-blue-300 bg-blue-50/30"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-2xl">{categoryConfig.icon}</span>
            <div className="flex-1">
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              {feature.description && (
                <p className="text-sm text-gray-600 mt-2">{feature.description}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleVote}
            disabled={!isAuthenticated || hasVoted || isVoting}
            className={cn(
              "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all",
              hasVoted
                ? "bg-blue-100 text-blue-700 cursor-not-allowed"
                : isAuthenticated
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-500 cursor-not-allowed",
              isVoting && "opacity-50"
            )}
            title={hasVoted ? "You voted for this" : !isAuthenticated ? "Sign in to vote" : "Vote for this feature"}
          >
            {hasVoted ? (
              <>
                <Check className="h-4 w-4" />
                <span className="text-sm font-bold">{feature.vote_count}</span>
              </>
            ) : isVoting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ArrowUp className="h-4 w-4" />
                <span className="text-sm font-bold">{feature.vote_count}</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Badge className={cn("text-xs", categoryConfig.color)}>
            {categoryConfig.name}
          </Badge>
          <Badge className={cn("text-xs", statusConfig.color)}>
            {statusConfig.icon} {statusConfig.label}
          </Badge>
          {feature.estimated_completion_date && feature.status !== 'completed' && (
            <Badge variant="outline" className="text-xs">
              Est: {new Date(feature.estimated_completion_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </Badge>
          )}
          {showCompletedDate && feature.completed_at && (
            <Badge variant="outline" className="text-xs text-green-700 border-green-300">
              Shipped: {new Date(feature.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Badge>
          )}
        </div>
      </CardHeader>
    </Card>
  )
}
