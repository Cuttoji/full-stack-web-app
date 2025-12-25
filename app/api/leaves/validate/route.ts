import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { mockTasks } from '@/lib/mockData';
import { TaskStatus } from '@/lib/types';

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
    const conflictingTasks = mockTasks.filter((task) => {
      if (task.status !== TaskStatus.WAITING) return false;
      
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      
      // Check if user is assigned to this task
      const isAssigned = task.assignments?.some((a) => a.userId === userId);
      if (!isAssigned) return false;
      
      // Check date overlap
      return taskStart <= leaveEnd && taskEnd >= leaveStart;
    });

    return NextResponse.json({
      success: true,
      data: {
        hasConflicts: conflictingTasks.length > 0,
        conflictCount: conflictingTasks.length,
        conflictingTasks: conflictingTasks.map((task) => ({
          id: task.id,
          jobNumber: task.jobNumber,
          title: task.title,
          startDate: task.startDate,
          endDate: task.endDate,
          status: task.status,
        })),
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
