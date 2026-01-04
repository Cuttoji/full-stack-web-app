import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { ApiResponse } from '@/lib/types';
import prisma from '@/lib/prisma';

// GET /api/notifications - Get user notifications
export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const whereClause = {
      userId: user.id,
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน' },
      { status: 500 }
    );
  }
});

// PATCH /api/notifications - Mark notifications as read
export const PATCH = withAuth(async (request, user) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { notificationIds } = body as { notificationIds?: string[] };

    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.id,
        },
        data: {
          isRead: true,
        },
      });
    } else {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'อ่านการแจ้งเตือนแล้ว',
    });
  } catch (error) {
    console.error('Mark notifications error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
});
