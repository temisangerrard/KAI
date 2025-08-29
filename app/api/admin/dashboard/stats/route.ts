import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/lib/auth/admin-auth';
import { AdminDashboardService } from '@/lib/services/admin-dashboard-service';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: authResult.error 
      }, { status: 401 });
    }

    // Get comprehensive dashboard statistics from real Firestore data
    const stats = await AdminDashboardService.getDashboardStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}