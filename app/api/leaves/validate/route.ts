import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Check if a user has pending tasks during their leave dates
 * GET /api/leaves/validate?userId=xxx&startDate=xxx&endDate=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'ไม่พบ token' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token ไม่ถูกต้อง' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ userId, startDate และ endDate' },
        { status: 400 }
      );
    }

    const leaveStart = new Date(startDate);
    const leaveEnd = new Date(endDate);

    // Find all WAITING tasks assigned to this user that overlap with leave dates
    const conflictingTasks = await prisma.task.findMany({
      where: {
        status: 'WAITING',
        assignments: {
          some: { userId },
        },
        AND: [
          { startDate: { lte: leaveEnd } },
          { endDate: { gte: leaveStart } },
        ],
      },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        hasConflicts: conflictingTasks.length > 0,
        conflictCount: conflictingTasks.length,
        conflictingTasks,
      },
    });
  } catch (error) {
    console.error('Error validating leave:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบ' },
      { status: 500 }
    );
  }
}
