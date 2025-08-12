import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getAuditLogs, getAuditStats } from '@/lib/admin/audit'

export async function GET(request: NextRequest) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    
    // Check if requesting stats
    if (searchParams.get('stats') === 'true') {
      const stats = await getAuditStats()
      return NextResponse.json(stats)
    }

    // Get pagination and filter params
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || undefined
    const actionFilter = searchParams.get('action') || undefined
    const dateFilter = searchParams.get('date') || undefined

    const result = await getAuditLogs(
      page,
      limit,
      search,
      actionFilter,
      dateFilter
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin audit API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}