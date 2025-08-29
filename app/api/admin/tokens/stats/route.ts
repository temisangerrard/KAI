import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/lib/auth/admin-auth';
import { AdminDashboardService } from '@/lib/services/admin-dashboard-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🪙 Fetching enhanced token stats with Firebase Auth users...');

    // Get enhanced token economy statistics with Firebase Auth user count
    const stats = await AdminDashboardService.getEnhancedTokenStats();
    
    console.log(`✅ Token stats retrieved: ${stats.circulation.totalUsers} users`);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ Error fetching token stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch token statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

