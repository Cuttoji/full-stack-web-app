import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { ApiResponse } from '@/lib/types';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Query schema
const getNotificationsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  unreadOnly: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  type: z.string().optional(),
});

// GET /api/notifications - Get user notifications
export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = getNotificationsQuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      unreadOnly: searchParams.get('unreadOnly'),
      type: searchParams.get('type'),
    });

    const whereClause = {
      userId: user.id,
      ...(query.unreadOnly && { isRead: false }),
      ...(query.type && { type: query.type }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        skip: query.offset,
        take: query.limit,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
    ]);

    // Group notifications by date
    const grouped = notifications.reduce((acc, notif) => {
      const date = new Date(notif.createdAt).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(notif);
      return acc;
    }, {} as Record<string, typeof notifications>);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        notifications,
        grouped,
        total,
        unreadCount,
        hasMore: query.offset + notifications.length < total,
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
    const { notificationIds, markAll } = body as { 
      notificationIds?: string[];
      markAll?: boolean;
    };

    let updatedCount = 0;

    if (markAll) {
      // Mark all notifications as read
      const result = await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
      updatedCount = result.count;
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.id,
        },
        data: {
          isRead: true,
        },
      });
      updatedCount = result.count;
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `อ่านการแจ้งเตือน ${updatedCount} รายการแล้ว`,
      data: { updatedCount },
    });
  } catch (error) {
    console.error('Mark notifications error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
});

// DELETE /api/notifications - Delete notifications
export const DELETE = withAuth(async (request, user) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { notificationIds, deleteAll, deleteRead } = body as {
      notificationIds?: string[];
      deleteAll?: boolean;
      deleteRead?: boolean;
    };

    let deletedCount = 0;

    if (deleteAll) {
      // Delete all notifications
      const result = await prisma.notification.deleteMany({
        where: { userId: user.id },
      });
      deletedCount = result.count;
    } else if (deleteRead) {
      // Delete only read notifications
      const result = await prisma.notification.deleteMany({
        where: {
          userId: user.id,
          isRead: true,
        },
      });
      deletedCount = result.count;
    } else if (notificationIds && notificationIds.length > 0) {
      // Delete specific notifications
      const result = await prisma.notification.deleteMany({
        where: {
          id: { in: notificationIds },
          userId: user.id,
        },
      });
      deletedCount = result.count;
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `ลบการแจ้งเตือน ${deletedCount} รายการแล้ว`,
      data: { deletedCount },
    });
  } catch (error) {
    console.error('Delete notifications error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบ' },
      { status: 500 }
    );
  }
});
