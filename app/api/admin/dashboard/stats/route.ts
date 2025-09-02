import { NextRequest, NextResponse } from 'next/server';
import { isBuildTime, createBuildSafeResponse } from '@/lib/utils/build-safe-imports';
import { AdminDashboardService } from '@/lib/services/admin-dashboard-service';

export async function GET(request: NextRequest) {
  // Prevent execution during build time
  if (isBuildTime()) {
    return NextResponse.json(createBuildSafeResponse());
  }
  try {
    console.log('📊 Fetching dashboard stats with Firebase Auth users...');

    // Get comprehensive dashboard statistics with Firebase Auth user count
    const stats = await AdminDashboardService.getDashboardStats();

    console.log(`✅ Dashboard stats retrieved: ${stats.users.totalUsers} users`);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}