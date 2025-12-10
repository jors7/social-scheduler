import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAllAPIConfigs, getActiveDeprecations, getDaysUntilDeprecation } from '@/lib/api-monitor/config';
import { getRecentAlerts, cleanupExpiredAlerts } from '@/lib/api-monitor/alerts';

export async function GET(request: NextRequest) {
  // Check admin access
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Get all platform configurations
    const configs = getAllAPIConfigs();

    // Get recent alerts (last 7 days)
    const recentAlerts = await getRecentAlerts(7);

    // Get active deprecations
    const activeDeprecations = getActiveDeprecations();

    // Calculate platform health based on recent alerts
    const platformHealth: Record<string, { status: 'healthy' | 'warning' | 'error'; lastAlert?: string; alertCount: number }> = {};

    for (const config of configs) {
      const platformAlerts = recentAlerts.filter(a => a.platform === config.platform);
      const hasError = platformAlerts.some(a => a.severity === 'error' || a.severity === 'critical');
      const hasWarning = platformAlerts.some(a => a.severity === 'warning');

      platformHealth[config.platform] = {
        status: hasError ? 'error' : hasWarning ? 'warning' : 'healthy',
        lastAlert: platformAlerts[0]?.alerted_at,
        alertCount: platformAlerts.length,
      };
    }

    // Format upcoming deprecations with days remaining
    const deprecationsWithDays = activeDeprecations.map(dep => ({
      ...dep,
      daysUntil: getDaysUntilDeprecation(dep.deprecationDate),
    }));

    return NextResponse.json({
      platforms: configs.map(config => ({
        platform: config.platform,
        currentVersion: config.currentVersion,
        baseUrl: config.baseUrl,
        expectedMetrics: config.expectedMetrics,
        notes: config.notes,
        health: platformHealth[config.platform],
        deprecations: config.deprecations,
      })),
      recentAlerts: recentAlerts.slice(0, 20), // Limit to 20 most recent
      upcomingDeprecations: deprecationsWithDays,
      summary: {
        totalPlatforms: configs.length,
        healthyPlatforms: Object.values(platformHealth).filter(h => h.status === 'healthy').length,
        warningPlatforms: Object.values(platformHealth).filter(h => h.status === 'warning').length,
        errorPlatforms: Object.values(platformHealth).filter(h => h.status === 'error').length,
        totalAlerts: recentAlerts.length,
        activeDeprecations: activeDeprecations.length,
      },
    });
  } catch (error) {
    console.error('[API Status] Error fetching status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API status' },
      { status: 500 }
    );
  }
}

// POST endpoint to trigger cleanup of expired alerts
export async function POST(request: NextRequest) {
  // Check admin access
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { action } = await request.json();

    if (action === 'cleanup') {
      const cleanedCount = await cleanupExpiredAlerts();
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${cleanedCount} expired alerts`,
        cleanedCount,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[API Status] Error processing action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
