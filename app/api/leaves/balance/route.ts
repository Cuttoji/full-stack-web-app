import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { ApiResponse, LeaveType, UserLeaveBalance, UserLeaveQuota, Leave } from '@/lib/types';
import prisma from '@/lib/prisma';
import { 
  calculateUserQuota, 
  calculateUsedLeave, 
  getLeaveQuotaSummary 
} from '@/lib/leaveQuota';

// GET /api/leaves/balance - Get user's leave balance
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
    const userId = searchParams.get('userId') || currentUser.id;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Find user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบข้อมูลผู้ใช้' },
        { status: 404 }
      );
    }

    // Get user's leaves for the year
    const userLeaves = await prisma.leave.findMany({
      where: {
        userId,
        startDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });

    // Calculate balance for each leave type
    const quotas: UserLeaveQuota[] = Object.values(LeaveType).map((type) => {
      // Get base quota from config
      const employmentStartDate = user.employmentStartDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1));
      const totalQuota = calculateUserQuota(type as LeaveType, employmentStartDate);

      // Calculate used and pending
      const { used, pending } = calculateUsedLeave(
        userLeaves.map((l: typeof userLeaves[number]) => ({
          ...l,
          approvedById: l.approvedById ?? undefined,
          approvedAt: l.approvedAt ?? undefined,
        })) as Leave[],
        type as LeaveType,
        year
      );

      return {
        type: type as LeaveType,
        totalQuota,
        used,
        remaining: Math.max(0, totalQuota - used - pending),
        pending,
      };
    });

    const balance: UserLeaveBalance = {
      userId,
      year,
      employmentStartDate: user.employmentStartDate || undefined,
      birthMonth: user.birthMonth || 1,
      quotas,
    };

    // Get summary with additional info
    const summary = getLeaveQuotaSummary(balance);

    return NextResponse.json<ApiResponse<{
      balance: UserLeaveBalance;
      summary: typeof summary;
    }>>({
      success: true,
      data: {
        balance,
        summary,
      },
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลโควตาการลา' },
      { status: 500 }
    );
  }
}
