import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, canApproveLeaveFor } from '@/lib/auth';
import { ApiResponse, CreateLeaveRequest, Leave, LeaveStatus, PaginatedResponse, Role, DefaultRoleScope, LeaveApprovalChain } from '@/lib/types';
import { USE_MOCK_DB } from '@/lib/mockDb';
import { mockLeaves, mockUsers } from '@/lib/mockData';

// GET /api/leaves - Get leaves (with filters)
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as LeaveStatus | null;
    const userId = searchParams.get('userId');
    const pendingApproval = searchParams.get('pendingApproval') === 'true';

    if (USE_MOCK_DB) {
      let filteredLeaves = [...mockLeaves];

      if (status) {
        filteredLeaves = filteredLeaves.filter(l => l.status === status);
      }
      if (userId) {
        filteredLeaves = filteredLeaves.filter(l => l.userId === userId);
      }

      // Permission Scope-based filtering
      const userScope = DefaultRoleScope[currentUser.role as Role];
      
      if (userScope.type === 'SELF') {
        // TECH, FINANCE, SALES - เห็นแค่ของตัวเอง
        filteredLeaves = filteredLeaves.filter(l => l.userId === currentUser.id);
      } else if (userScope.type === 'SUBUNIT') {
        // LEADER - เห็นของทีมตัวเอง
        filteredLeaves = filteredLeaves.filter(l => {
          const user = mockUsers.find(u => u.id === l.userId);
          return user?.subUnitId === currentUser.subUnitId || l.userId === currentUser.id;
        });
      } else if (userScope.type === 'DEPARTMENT') {
        // HEAD_TECH, FINANCE_LEADER, SALES_LEADER - เห็นของแผนกตัวเอง
        filteredLeaves = filteredLeaves.filter(l => {
          const user = mockUsers.find(u => u.id === l.userId);
          return user?.departmentId === currentUser.departmentId || l.userId === currentUser.id;
        });
      }
      // ALL scope (ADMIN, CUSTOMER_SERVICE) - เห็นทั้งหมด

      // Filter pending approval - แสดงเฉพาะที่รอการอนุมัติจากผู้ใช้ปัจจุบัน
      if (pendingApproval) {
        filteredLeaves = filteredLeaves.filter(l => {
          if (l.status !== 'PENDING') return false;
          const leaveUser = mockUsers.find(u => u.id === l.userId) as (typeof mockUsers[0] & { supervisorId?: string }) | undefined;
          if (!leaveUser) return false;
          
          // ตรวจสอบว่าเป็น supervisor โดยตรงหรือไม่
          if (leaveUser.supervisorId === currentUser.id) return true;
          
          // ตรวจสอบจาก LeaveApprovalChain
          return canApproveLeaveFor(
            currentUser.role as Role,
            currentUser.id,
            leaveUser.role as Role,
            leaveUser.supervisorId
          );
        });
      }

      const total = filteredLeaves.length;
      const paginatedLeaves = filteredLeaves.slice((page - 1) * limit, page * limit);

      return NextResponse.json<ApiResponse<PaginatedResponse<Leave>>>({
        success: true,
        data: {
          data: paginatedLeaves as Leave[],
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Get leaves error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการลา' },
      { status: 500 }
    );
  }
}

// POST /api/leaves - Create leave request
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

    const body: CreateLeaveRequest = await request.json();
    const { type, startDate, endDate, totalDays, reason } = body;

    if (!type || !startDate || !endDate || !totalDays) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (USE_MOCK_DB) {
      // Check quota
      const user = mockUsers.find(u => u.id === currentUser.id);
      if (user) {
        const remainingQuota = user.leaveQuota - user.leaveUsed;
        if (totalDays > remainingQuota) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: `โควตาลาไม่เพียงพอ (คงเหลือ ${remainingQuota} วัน)` },
            { status: 400 }
          );
        }
      }

      // หาผู้อนุมัติคนแรกจาก supervisorId หรือ LeaveApprovalChain
      let currentApproverId: string | null = null;
      const userWithSupervisor = user as (typeof user & { supervisorId?: string }) | undefined;
      if (userWithSupervisor?.supervisorId) {
        currentApproverId = userWithSupervisor.supervisorId;
      } else {
        // หาจาก LeaveApprovalChain
        const approverRoles = LeaveApprovalChain[currentUser.role as Role];
        if (approverRoles && approverRoles.length > 0) {
          const approver = mockUsers.find(u => approverRoles.includes(u.role as Role));
          currentApproverId = approver?.id || null;
        }
      }

      const newLeave = {
        id: `leave-${Date.now()}`,
        userId: currentUser.id,
        user: user || null,
        type,
        status: 'PENDING' as LeaveStatus,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays,
        reason: reason || '',
        currentApproverId,
        approvalChain: [],
        approvalLevel: 1,
        approvedById: null,
        approver: null,
        approverNote: null,
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return NextResponse.json<ApiResponse<Leave>>({
        success: true,
        data: newLeave as unknown as Leave,
        message: 'ส่งคำขอลาสำเร็จ',
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Create leave error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการส่งคำขอลา' },
      { status: 500 }
    );
  }
}
