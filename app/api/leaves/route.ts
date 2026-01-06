import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { 
  ApiResponse, 
  CreateLeaveRequest, 
  Leave, 
  LeaveStatus, 
  LeaveType,
  LeaveDurationType,
  HalfDayPeriod,
  PaginatedResponse, 
  Role, 
  DefaultRoleScope, 
  LeaveApprovalChain,
  LEAVE_TYPE_CONFIGS,
  LEAVE_TYPE_LABELS,
  AuthUser,
} from '@/lib/types';
import prisma from '@/lib/prisma';
import { 
  getUserLeaveBalance, 
  validateLeaveRequest, 
  calculateLeaveDays,
  isValidDurationType,
} from '@/lib/leaveQuota';
import { notifyLeaveRequest } from '@/lib/notifications';
import { notifyLeaveRequestViaWebhook } from '@/lib/webhook';

// GET /api/leaves - Get leaves (with filters)
export const GET = withAuth(async (request: NextRequest, currentUser: AuthUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as LeaveStatus | null;
    const userId = searchParams.get('userId');
    const pendingApproval = searchParams.get('pendingApproval') === 'true';

    // Build where clause based on user permissions
    const userScope = DefaultRoleScope[currentUser.role as Role];
    
    // Prisma where clause - use Prisma's type system
    const whereClause: {
      status?: LeaveStatus;
      userId?: string | { in: string[] };
      currentApproverId?: string;
    } = {};

    if (status) {
      whereClause.status = status;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    // Apply scope-based filtering
    if (userScope.type === 'SELF') {
      // TECH, FINANCE, SALES - can only see their own leaves
      whereClause.userId = currentUser.id;
    } else if (userScope.type === 'SUBUNIT' && currentUser.subUnitId) {
      // LEADER - can see their team's leaves
      const teamUsers = await prisma.user.findMany({
        where: { subUnitId: currentUser.subUnitId },
        select: { id: true },
      });
      const teamUserIds = teamUsers.map((u: { id: string }) => u.id);
      if (!userId) {
        whereClause.userId = { in: teamUserIds };
      }
    } else if (userScope.type === 'DEPARTMENT' && currentUser.departmentId) {
      // HEAD_TECH, FINANCE_LEADER, SALES_LEADER - can see their department's leaves
      const deptUsers = await prisma.user.findMany({
        where: { departmentId: currentUser.departmentId },
        select: { id: true },
      });
      const deptUserIds = deptUsers.map((u: { id: string }) => u.id);
      if (!userId) {
        whereClause.userId = { in: deptUserIds };
      }
    }
    // ALL scope (ADMIN, CUSTOMER_SERVICE) - can see all leaves

    // Filter pending approval - only show leaves awaiting approval from current user
    if (pendingApproval) {
      whereClause.status = LeaveStatus.PENDING;
      whereClause.currentApproverId = currentUser.id;
    }

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              departmentId: true,
              subUnitId: true,
              supervisorId: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          approvalChain: {
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
            orderBy: {
              level: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leave.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json<ApiResponse<PaginatedResponse<Leave>>>({
      success: true,
      data: {
        data: leaves as unknown as Leave[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get leaves error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการลา' },
      { status: 500 }
    );
  }
});

// POST /api/leaves - Create leave request
export const POST = withAuth(async (request: NextRequest, currentUser: AuthUser) => {
  try {
    const body: CreateLeaveRequest = await request.json();
    const { 
      type, 
      startDate, 
      endDate, 
      reason,
      durationType = LeaveDurationType.FULL_DAY,
      halfDayPeriod,
      startTime,
      endTime,
    } = body;

    if (!type || !startDate || !endDate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Calculate leave days
    const calculatedTotalDays = body.totalDays || calculateLeaveDays(
      new Date(startDate),
      new Date(endDate),
      durationType as LeaveDurationType,
      startTime,
      endTime
    );

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบข้อมูลผู้ใช้' },
        { status: 404 }
      );
    }

    // Validate duration type for leave type
    const leaveTypeKey = type as LeaveType;
    if (!isValidDurationType(leaveTypeKey, durationType as LeaveDurationType)) {
      const config = LEAVE_TYPE_CONFIGS[leaveTypeKey];
      const allowedTypes = config.allowedDurationTypes.map(t => {
        switch(t) {
          case LeaveDurationType.FULL_DAY: return 'เต็มวัน';
          case LeaveDurationType.HALF_DAY: return 'ครึ่งวัน';
          case LeaveDurationType.TIME_BASED: return 'ตามเวลา';
        }
      }).join(', ');
      return NextResponse.json<ApiResponse>(
        { success: false, error: `${config.label}สามารถลาได้แบบ ${allowedTypes} เท่านั้น` },
        { status: 400 }
      );
    }

    // Get user's existing leaves for balance calculation
    const userLeaves = await prisma.leave.findMany({
      where: {
        userId: currentUser.id,
        status: { in: ['APPROVED', 'PENDING'] },
      },
    });

    // Calculate leave balance - use typed user properties
    const userWithDates = user as typeof user & {
      employmentStartDate?: Date | null;
      birthMonth?: number | null;
    };
    
    const balance = getUserLeaveBalance(
      currentUser.id,
      userLeaves.map(l => ({
        ...l,
        approvedById: l.approvedById ?? undefined,
        approvedAt: l.approvedAt ?? undefined,
      })) as Leave[],
      userWithDates.employmentStartDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      userWithDates.birthMonth ?? undefined,
      new Date(startDate).getFullYear()
    );

    // Validate leave request
    const validation = validateLeaveRequest(
      leaveTypeKey,
      new Date(startDate),
      new Date(endDate),
      calculatedTotalDays,
      durationType as LeaveDurationType,
      balance,
      halfDayPeriod as HalfDayPeriod | undefined
    );

    if (!validation.isValid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Find first approver from supervisorId or LeaveApprovalChain
    let currentApproverId: string | null = null;
    if (user.supervisorId) {
      currentApproverId = user.supervisorId;
    } else {
      // Find from LeaveApprovalChain
      const approverRoles = LeaveApprovalChain[currentUser.role as Role];
      if (approverRoles && approverRoles.length > 0) {
        const approver = await prisma.user.findFirst({
          where: {
            role: { in: approverRoles },
            isActive: true,
          },
        });
        currentApproverId = approver?.id || null;
      }
    }

    // Create leave request with proper typing
    const newLeave = await prisma.leave.create({
      data: {
        userId: currentUser.id,
        type,
        status: 'PENDING',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays: calculatedTotalDays,
        reason: reason || null,
        durationType,
        halfDayPeriod: halfDayPeriod || null,
        startTime: startTime || null,
        endTime: endTime || null,
        currentApproverId,
        approvalLevel: 1,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        approvalChain: true,
      },
    });

    // Send notification to approver
    if (currentApproverId) {
      const leaveTypeLabel = LEAVE_TYPE_LABELS[type as keyof typeof LEAVE_TYPE_LABELS] || type;
      
      // In-app notification
      await notifyLeaveRequest(
        newLeave.id,
        newLeave.user.name,
        leaveTypeLabel,
        new Date(startDate),
        new Date(endDate),
        [currentApproverId]
      );

      // Send via webhook (Power Automate, LINE, etc.)
      const approver = await prisma.user.findUnique({
        where: { id: currentApproverId },
        select: { email: true, name: true },
      });

      if (approver?.email) {
        await notifyLeaveRequestViaWebhook(
          newLeave.user.name,
          newLeave.user.email,
          approver.name,
          approver.email,
          leaveTypeLabel,
          new Date(startDate),
          new Date(endDate),
          calculatedTotalDays,
          reason || ''
        );
      }
    }

    // Return with warnings if any
    const responseData: { leave: typeof newLeave; warnings?: string[] } = {
      leave: newLeave,
    };
    
    if (validation.warnings.length > 0) {
      responseData.warnings = validation.warnings;
    }

    return NextResponse.json<ApiResponse<typeof responseData>>({
      success: true,
      data: responseData,
      message: 'ส่งคำขอลาสำเร็จ',
    });
  } catch (error) {
    console.error('Create leave error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการส่งคำขอลา' },
      { status: 500 }
    );
  }
});
