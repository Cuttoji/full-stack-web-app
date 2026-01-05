import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { ApiResponse, DashboardStats, LeaderDashboardStats, AuthUser } from '@/lib/types';
import prisma from '@/lib/prisma';
import { handlePrismaError, isPrismaError, getHttpStatusForDbError } from '@/lib/dbErrors';

// GET /api/dashboard - Get dashboard statistics
export const GET = withAuth(async (request: NextRequest, currentUser: AuthUser) => {
  try {
    // Get real stats from database
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (currentUser.role === 'LEADER' && currentUser.subUnitId) {
      // Leader dashboard - team-specific stats
      const [
        totalTasks,
        waitingTasks,
        inProgressTasks,
        completedTasks,
        cancelledTasks,
        todayTasks,
        teamMembers,
        pendingLeaves,
        teamOnLeaveToday,
        availableCars,
      ] = await Promise.all([
        prisma.task.count({
          where: { subUnitId: currentUser.subUnitId },
        }),
        prisma.task.count({
          where: { subUnitId: currentUser.subUnitId, status: 'WAITING' },
        }),
        prisma.task.count({
          where: { subUnitId: currentUser.subUnitId, status: 'IN_PROGRESS' },
        }),
        prisma.task.count({
          where: { subUnitId: currentUser.subUnitId, status: 'DONE' },
        }),
        prisma.task.count({
          where: { subUnitId: currentUser.subUnitId, status: 'CANCELLED' },
        }),
        prisma.task.count({
          where: {
            subUnitId: currentUser.subUnitId,
            createdAt: { gte: today, lt: tomorrow },
          },
        }),
        prisma.user.count({
          where: { subUnitId: currentUser.subUnitId, isActive: true },
        }),
        prisma.leave.count({
          where: {
            user: { subUnitId: currentUser.subUnitId },
            status: 'PENDING',
          },
        }),
        prisma.leave.count({
          where: {
            user: { subUnitId: currentUser.subUnitId },
            status: 'APPROVED',
            startDate: { lte: today },
            endDate: { gte: today },
          },
        }),
        prisma.car.count({ where: { status: 'AVAILABLE' } }),
      ]);

      const leaderStats: LeaderDashboardStats = {
        totalTasks,
        waitingTasks,
        inProgressTasks,
        completedTasks,
        cancelledTasks,
        todayTasks,
        pendingLeaves,
        availableCars,
        teamMembersCount: teamMembers,
        teamOnLeaveToday,
        pendingLeaveRequests: pendingLeaves,
      };

      return NextResponse.json<ApiResponse<LeaderDashboardStats>>({
        success: true,
        data: leaderStats,
      });
    }

    // Admin/General dashboard
    const [
      totalTasks,
      waitingTasks,
      inProgressTasks,
      completedTasks,
      cancelledTasks,
      todayTasks,
      pendingLeaves,
      availableCars,
    ] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: 'WAITING' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { status: 'DONE' } }),
      prisma.task.count({ where: { status: 'CANCELLED' } }),
      prisma.task.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.leave.count({ where: { status: 'PENDING' } }),
      prisma.car.count({ where: { status: 'AVAILABLE' } }),
    ]);

    const stats: DashboardStats = {
      totalTasks,
      waitingTasks,
      inProgressTasks,
      completedTasks,
      cancelledTasks,
      todayTasks,
      pendingLeaves,
      availableCars,
    };

    return NextResponse.json<ApiResponse<DashboardStats>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    
    if (isPrismaError(error)) {
      const dbError = handlePrismaError(error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: dbError.message },
        { status: getHttpStatusForDbError(dbError) }
      );
    }
    
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard' },
      { status: 500 }
    );
  }
});
