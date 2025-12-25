import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { ApiResponse, OfflineAction, SyncResult } from '@/lib/types';

// POST /api/sync - Sync offline actions
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { actions, deviceId } = body as { actions: OfflineAction[]; deviceId: string };

    if (!actions || !Array.isArray(actions)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid actions data' },
        { status: 400 }
      );
    }

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    // Process each offline action
    for (const action of actions) {
      try {
        // Store in offline queue for processing
        await prisma.offlineQueue.create({
          data: {
            deviceId,
            action: action.action,
            endpoint: action.endpoint,
            method: action.method,
            payload: action.payload as any,
            status: 'PENDING',
          },
        });

        // Process the action based on type
        switch (action.action) {
          case 'UPDATE_TASK_STATUS':
            const { taskId, status } = action.payload as any;
            await prisma.task.update({
              where: { id: taskId },
              data: {
                status,
                ...(status === 'DONE' ? { completedAt: new Date() } : {}),
              },
            });
            break;

          case 'CREATE_PRINTER_LOG':
            await prisma.printerLog.create({
              data: action.payload as any,
            });
            break;

          case 'CREATE_TASK_IMAGE':
            await prisma.taskImage.create({
              data: action.payload as any,
            });
            break;

          default:
            // Log unknown action
            console.warn('Unknown offline action:', action.action);
        }

        // Mark as completed
        await prisma.offlineQueue.updateMany({
          where: { deviceId, action: action.action },
          data: { status: 'COMPLETED', processedAt: new Date() },
        });

        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors?.push(`Failed to process action: ${action.action}`);

        // Mark as failed
        await prisma.offlineQueue.updateMany({
          where: { deviceId, action: action.action },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: { increment: 1 },
          },
        });
      }
    }

    result.success = result.failed === 0;

    return NextResponse.json<ApiResponse<SyncResult>>({
      success: true,
      data: result,
      message: `Synced ${result.synced} actions, ${result.failed} failed`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการ Sync ข้อมูล' },
      { status: 500 }
    );
  }
}

// GET /api/sync - Get pending sync items
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
    const deviceId = searchParams.get('deviceId');

    const where: any = { status: { in: ['PENDING', 'FAILED'] } };
    if (deviceId) where.deviceId = deviceId;

    const pendingItems = await prisma.offlineQueue.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: pendingItems,
    });
  } catch (error) {
    console.error('Get sync items error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Sync' },
      { status: 500 }
    );
  }
}
