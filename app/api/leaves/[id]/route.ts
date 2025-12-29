import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeader, hasPermission, canApproveLeaveFor } from '@/lib/auth';
import { ApiResponse, ApproveLeaveRequest, Leave, Role, LeaveApprovalChain } from '@/lib/types';

// GET /api/leaves/[id] - Get leave by ID
export async function GET(
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

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            phone: true,
            leaveQuota: true,
            leaveUsed: true,
            subUnit: true,
            department: true,
          },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!leave) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบข้อมูลการลา' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Leave>>({
      success: true,
      data: leave as any,
    });
  } catch (error) {
    console.error('Get leave error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการลา' },
      { status: 500 }
    );
  }
}

// PATCH /api/leaves/[id] - Approve/Reject leave (Leader only)
export async function PATCH(
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

    if (!hasPermission(currentUser.role as Role, 'canApproveLeave')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการอนุมัติการลา' },
        { status: 403 }
      );
    }

    const body: Omit<ApproveLeaveRequest, 'leaveId'> = await request.json();
    const { approved, rejectedReason } = body;

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!leave) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบข้อมูลการลา' },
        { status: 404 }
      );
    }

    // Hierarchical Approval Check
    const canApprove = canApproveLeaveFor(
      currentUser.role as Role,
      currentUser.id,
      leave.user.role as Role,
      (leave.user as any).supervisorId
    );

    if (!canApprove) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์อนุมัติการลานี้ตามลำดับชั้นองค์กร' },
        { status: 403 }
      );
    }

    if (leave.status !== 'PENDING') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'การลานี้ได้รับการพิจารณาแล้ว' },
        { status: 400 }
      );
    }

    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        approvedById: currentUser.id,
        approvedAt: new Date(),
        rejectedReason: approved ? null : rejectedReason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            leaveQuota: true,
            leaveUsed: true,
          },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Update user's leave used if approved
    if (approved) {
      await prisma.user.update({
        where: { id: leave.userId },
        data: {
          leaveUsed: {
            increment: leave.totalDays,
          },
        },
      });
    }

    // Notify user
    await prisma.notification.create({
      data: {
        userId: leave.userId,
        title: approved ? 'คำขอลาได้รับการอนุมัติ' : 'คำขอลาไม่ได้รับการอนุมัติ',
        message: approved
          ? `คำขอลาของคุณได้รับการอนุมัติแล้ว`
          : `คำขอลาของคุณไม่ได้รับการอนุมัติ: ${rejectedReason || ''}`,
        type: 'LEAVE',
        link: `/leaves/${id}`,
      },
    });

    return NextResponse.json<ApiResponse<Leave>>({
      success: true,
      data: updatedLeave as any,
      message: approved ? 'อนุมัติการลาสำเร็จ' : 'ปฏิเสธการลาสำเร็จ',
    });
  } catch (error) {
    console.error('Update leave error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตการลา' },
      { status: 500 }
    );
  }
}

// DELETE /api/leaves/[id] - Cancel leave request
export async function DELETE(
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

    const leave = await prisma.leave.findUnique({
      where: { id },
    });

    if (!leave) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบข้อมูลการลา' },
        { status: 404 }
      );
    }

    // Only owner or admin can cancel
    if (leave.userId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ยกเลิกการลานี้' },
        { status: 403 }
      );
    }

    if (leave.status !== 'PENDING') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่สามารถยกเลิกการลาที่ได้รับการพิจารณาแล้ว' },
        { status: 400 }
      );
    }

    await prisma.leave.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'ยกเลิกคำขอลาสำเร็จ',
    });
  } catch (error) {
    console.error('Delete leave error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการยกเลิกการลา' },
      { status: 500 }
    );
  }
}
