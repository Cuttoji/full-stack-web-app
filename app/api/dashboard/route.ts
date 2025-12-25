import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { ApiResponse, DashboardStats, LeaderDashboardStats } from '@/lib/types';
import { USE_MOCK_DB } from '@/lib/mockDb';
import { mockDashboardStats, mockLeaderDashboardStats } from '@/lib/mockData';

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    if (USE_MOCK_DB) {
      // Return mock stats based on role
      if (currentUser.role === 'LEADER' && currentUser.subUnitId) {
        return NextResponse.json<ApiResponse<LeaderDashboardStats>>({
          success: true,
          data: mockLeaderDashboardStats,
        });
      }

      return NextResponse.json<ApiResponse<DashboardStats>>({
        success: true,
        data: mockDashboardStats,
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard' },
      { status: 500 }
    );
  }
}
