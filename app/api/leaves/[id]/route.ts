import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeader, hasPermission, canApproveLeaveFor } from '@/lib/auth';
import { ApiResponse, ApproveLeaveRequest, Leave, Role, LeaveStatus, LEAVE_TYPE_LABELS } from '@/lib/types';
import { notifyLeaveApproved, notifyLeaveRejected } from '@/lib/notifications';
import { notifyLeaveApprovalViaWebhook } from '@/lib/webhook';

// Type for leave with included user
interface LeaveWithUser {
  id: string;
  userId: string;
  status: LeaveStatus | string;
  totalDays: number;
  startDate: Date;
  endDate: Date;
  user: {
    id: string;
    role: string;
    supervisorId?: string | null;
  };
}

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
            role: true,
            supervisorId: true,
            leaveQuota: true,
            leaveUsed: true,
            subUnit: true,
            department: true,
          },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        approvalChain: {
          include: {
            approver: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { level: 'asc' },
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
      data: leave as unknown as Leave,
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

    const body: Omit<ApproveLeaveRequest, 'leaveId'> & { approverNote?: string } = await request.json();
    const { approved, rejectedReason, approverNote } = body;

    // Debug log - ตรวจสอบค่าที่ได้รับ
    console.log('Leave approval request:', { approved, rejectedReason, approverNote, body });

    // Ensure approved is a boolean (handle both boolean and string)
    const isApproved = approved === true;

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            supervisorId: true,
          },
        },
      },
    }) as LeaveWithUser | null;

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
      leave.user.supervisorId ?? undefined
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

    // Start transaction for approval
    const updatedLeave = await prisma.$transaction(async (tx) => {
      // Create approval record in LeaveApproval chain
      await tx.leaveApproval.create({
        data: {
          leaveId: id,
          approverId: currentUser.id,
          approverRole: currentUser.role as Role,
          level: 1, // TODO: ปรับตาม approval level จริง
          status: isApproved ? 'APPROVED' : 'REJECTED',
          comment: isApproved ? approverNote : rejectedReason,
          actionAt: new Date(),
        },
      });

      // Update leave status
      const updated = await tx.leave.update({
        where: { id },
        data: {
          status: isApproved ? 'APPROVED' : 'REJECTED',
          approvedById: currentUser.id,
          approvedAt: new Date(),
          rejectedReason: isApproved ? null : rejectedReason,
          approverNote: approverNote || null,
          currentApproverId: null, // Clear current approver
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
          approvalChain: {
            include: {
              approver: {
                select: { id: true, name: true, role: true },
              },
            },
            orderBy: { level: 'asc' },
          },
        },
      });

      // Update user's leave used if approved
      if (isApproved) {
        await tx.user.update({
          where: { id: leave.userId },
          data: {
            leaveUsed: {
              increment: leave.totalDays,
            },
          },
        });

        // Find task assignments for this user that overlap the leave period
        const overlappingAssignments = await tx.taskAssignment.findMany({
          where: {
            userId: leave.userId,
            task: {
              is: {
                startDate: { lte: leave.endDate },
                endDate: { gte: leave.startDate },
              },
            },
          },
          include: {
            task: {
              select: { id: true, title: true, createdById: true },
            },
          },
        });

        if (overlappingAssignments.length > 0) {
          // Remove the user's assignments for those tasks
          for (const a of overlappingAssignments) {
            await tx.taskAssignment.delete({ where: { id: a.id } });
          }

          // Notify task creators that the assignee was removed and needs reassignment
          const creatorIds = Array.from(new Set(overlappingAssignments.map(a => a.task.createdById)));
          if (creatorIds.length > 0) {
            await tx.notification.createMany({
              data: creatorIds.map((creatorId) => ({
                userId: creatorId,
                type: 'TASK',
                title: 'ช่างถูกนำออกจากงาน (เนื่องจากการลา)',
                message: `ผู้ใช้ ${leave.userId} ถูกนำออกจากงานที่ตรงกับช่วงเวลาการลา กรุณาตรวจสอบและจัดช่างใหม่`,
                link: `/tasks`,
                data: { removedUserId: leave.userId },
              })),
            });
          }

          // Notify users who can manage daily technician (HEAD_TECH or permission flag)
          const managers = await tx.user.findMany({
            where: {
              OR: [
                { role: 'HEAD_TECH' },
                { permissions: { path: ['canManageDailyTechnician'], equals: true } },
              ],
            },
            select: { id: true },
          });

          if (managers.length > 0) {
            const managerIds = managers.map(m => m.id);
            // Create notification entries for each affected task so managers can reassign
            const notificationsData: any[] = [];
            for (const a of overlappingAssignments) {
              notificationsData.push(...managerIds.map((mid) => ({
                userId: mid,
                type: 'TASK',
                title: 'งานต้องการการมอบหมายใหม่',
                message: `งาน "${a.task.title}" (ID: ${a.task.id}) ต้องการการมอบหมายใหม่ เนื่องจากผู้รับผิดชอบอยู่ในช่วงลา`,
                link: `/tasks/${a.task.id}`,
                data: { taskId: a.task.id, removedUserId: leave.userId },
              })));
            }

            if (notificationsData.length > 0) {
              await tx.notification.createMany({ data: notificationsData });
            }
          }
        }

      }
      return updated;
    });

    // Notify user using notification service
    if (isApproved) {
      await notifyLeaveApproved(id, leave.userId, currentUser.name || 'ผู้อนุมัติ');
    } else {
      await notifyLeaveRejected(id, leave.userId, currentUser.name || 'ผู้อนุมัติ', rejectedReason);
    }

    // Send via webhook (Power Automate, LINE, etc.)
    if (updatedLeave.user.email) {
      const leaveTypeLabel = LEAVE_TYPE_LABELS[updatedLeave.type as keyof typeof LEAVE_TYPE_LABELS] || updatedLeave.type;
      await notifyLeaveApprovalViaWebhook(
        updatedLeave.user.name,
        updatedLeave.user.email,
        currentUser.name || 'ผู้อนุมัติ',
        currentUser.email || '',
        leaveTypeLabel,
        new Date(updatedLeave.startDate),
        new Date(updatedLeave.endDate),
        updatedLeave.totalDays,
        isApproved,
        rejectedReason
      );
    }

    return NextResponse.json<ApiResponse<Leave>>({
      success: true,
      data: updatedLeave as unknown as Leave,
      message: isApproved ? 'อนุมัติการลาสำเร็จ' : 'ปฏิเสธการลาสำเร็จ',
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
