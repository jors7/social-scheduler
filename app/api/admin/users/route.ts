import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, logAdminAction } from '@/lib/admin/auth'
import { getUsersSimple, getAdminStatsSimple } from '@/lib/admin/users-simple'

export async function GET(request: NextRequest) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    
    // Check if requesting stats
    if (searchParams.get('stats') === 'true') {
      const stats = await getAdminStatsSimple()
      return NextResponse.json(stats)
    }

    // Get pagination and filter params
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || undefined
    const roleFilter = searchParams.get('role') || undefined
    const planFilter = searchParams.get('plan') || undefined
    const statusFilter = searchParams.get('status') || undefined
    const billingFilter = searchParams.get('billing') || undefined

    const result = await getUsersSimple(
      page,
      limit,
      search,
      roleFilter,
      planFilter,
      statusFilter,
      billingFilter
    )

    // Log the action
    await logAdminAction('view_users', undefined, 'user_list', {
      page,
      search,
      filters: { role: roleFilter, plan: planFilter, status: statusFilter, billing: billingFilter }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}