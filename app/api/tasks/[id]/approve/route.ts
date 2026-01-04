import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, Role } from '@/lib/types';
import prisma from '@/lib/prisma';
import { handlePrismaError, isPrismaError, getHttpStatusForDbError } from '@/lib/dbErrors';

interface ApprovalRequest {
  checklist: {
    id: string;
    label: string;
    checked: boolean;
    note?: string;
  }[];
  notes?: string;
}

// POST /api/tasks/[id]/approve - Approve completed task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    // Check permission - only Admin, Finance, HeadTech can approve
    const canApprove = hasPermission(currentUser.role as Role, 'canApproveTasks');
    if (!canApprove) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์อนุมัติงาน' },
        { status: 403 }
      );
    }

    const body: ApprovalRequest = await request.json();
    const { checklist, notes } = body;

    // Validate all checklist items are checked
    if (!checklist || !checklist.every(item => item.checked)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาตรวจสอบรายการให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Find the task
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบงาน' },
        { status: 404 }
      );
    }

    if (task.status !== 'DONE') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'สามารถอนุมัติได้เฉพาะงานที่เสร็จสิ้นแล้วเท่านั้น' },
        { status: 400 }
      );
    }

    // Update task with approval information
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        approvedById: currentUser.id,
        approvedAt: new Date(),
        approvalNotes: notes || null,
        approvalChecklist: JSON.stringify(checklist),
        updatedAt: new Date(),
      },
      include: {
        subUnit: true,
        car: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedTask,
      message: 'อนุมัติงานเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('Approve task error:', error);

    if (isPrismaError(error)) {
      const dbError = handlePrismaError(error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: dbError.message },
        { status: getHttpStatusForDbError(dbError) }
      );
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการอนุมัติงาน' },
      { status: 500 }
    );
  }
}
