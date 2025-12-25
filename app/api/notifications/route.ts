import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';
import { USE_MOCK_DB } from '@/lib/mockDb';
import { mockNotifications } from '@/lib/mockData';

// GET /api/notifications - Get user notifications
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (USE_MOCK_DB) {
      let filteredNotifications = mockNotifications.filter(n => n.userId === currentUser.id);
      
      if (unreadOnly) {
        filteredNotifications = filteredNotifications.filter(n => !n.isRead);
      }

      const notifications = filteredNotifications.slice(0, limit);
      const unreadCount = mockNotifications.filter(n => n.userId === currentUser.id && !n.isRead).length;

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          notifications,
          unreadCount,
        },
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
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
      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'อ่านการแจ้งเตือนแล้ว (Mock)',
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Mark notifications error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
