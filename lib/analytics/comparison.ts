import { createClient } from '@/lib/supabase/server'

export interface MetricValue {
  value: number
  previous: number
}

export interface SnapshotMetrics {
  [key: string]: number
}

export interface AnalyticsSnapshot {
  id: string
  user_id: string
  platform: string
  account_id: string
  snapshot_date: string
  metrics: SnapshotMetrics
  created_at: string
  updated_at: string
}

/**
 * Calculate percentage change between current and previous values
 * Returns null when previous is 0 (can't calculate meaningful percentage from nothing)
 * Returns 0 when both current and previous are 0 (no change)
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

/**
 * Get historical snapshot for a specific date
 */
export async function getHistoricalSnapshot(
  userId: string,
  platform: string,
  accountId: string,
  daysAgo: number
): Promise<AnalyticsSnapshot | null> {
  const supabase = await createClient()

  // Calculate target date
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() - daysAgo)
  const targetDateString = targetDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('account_id', accountId)
    .eq('snapshot_date', targetDateString)
    .single()

  if (error || !data) {
    console.log(`No snapshot found for ${platform} account ${accountId} on ${targetDateString}`)
    return null
  }

  return data
}

/**
 * Get the most recent snapshot before a given date
 */
export async function getClosestSnapshot(
  userId: string,
  platform: string,
  accountId: string,
  beforeDate: Date
): Promise<AnalyticsSnapshot | null> {
  const supabase = await createClient()

  const beforeDateString = beforeDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('account_id', accountId)
    .lte('snapshot_date', beforeDateString)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Get metrics with period comparison based on selected period
 */
export async function getPeriodMetrics(
  userId: string,
  platform: string,
  accountId: string,
  currentMetrics: SnapshotMetrics,
  period: 'day' | 'week' | 'days_28' = 'week'
): Promise<{ [key: string]: MetricValue }> {
  // Determine how many days ago to compare
  const daysAgo = period === 'day' ? 1 : period === 'week' ? 7 : 28

  // Get historical snapshot
  const previousSnapshot = await getHistoricalSnapshot(userId, platform, accountId, daysAgo)

  // If no historical data, try to get the closest snapshot before the target date
  let previousMetrics: SnapshotMetrics | null = null
  if (!previousSnapshot) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - daysAgo)
    const closestSnapshot = await getClosestSnapshot(userId, platform, accountId, targetDate)
    previousMetrics = closestSnapshot?.metrics || null
  } else {
    previousMetrics = previousSnapshot.metrics
  }

  // Build result with value/previous structure
  const result: { [key: string]: MetricValue } = {}

  for (const key in currentMetrics) {
    result[key] = {
      value: currentMetrics[key],
      previous: previousMetrics?.[key] || 0
    }
  }

  return result
}

/**
 * Create or update a snapshot for today
 */
export async function createSnapshot(
  userId: string,
  platform: string,
  accountId: string,
  metrics: SnapshotMetrics,
  snapshotDate?: Date
): Promise<AnalyticsSnapshot | null> {
  const supabase = await createClient()

  const date = snapshotDate || new Date()
  const dateString = date.toISOString().split('T')[0]

  // Use upsert to handle duplicates
  const { data, error } = await supabase
    .from('analytics_snapshots')
    .upsert({
      user_id: userId,
      platform,
      account_id: accountId,
      snapshot_date: dateString,
      metrics
    }, {
      onConflict: 'user_id,platform,account_id,snapshot_date'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating snapshot:', error)
    return null
  }

  return data
}

/**
 * Get all snapshots for a platform account within a date range
 */
export async function getSnapshotRange(
  userId: string,
  platform: string,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsSnapshot[]> {
  const supabase = await createClient()

  const startDateString = startDate.toISOString().split('T')[0]
  const endDateString = endDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('account_id', accountId)
    .gte('snapshot_date', startDateString)
    .lte('snapshot_date', endDateString)
    .order('snapshot_date', { ascending: true })

  if (error || !data) {
    return []
  }

  return data
}
