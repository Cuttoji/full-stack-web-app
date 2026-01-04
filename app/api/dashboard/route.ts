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
        teamTasks,
        pendingTasks,
        completedToday,
        teamMembers,
        pendingLeaves,
      ] = await Promise.all([
        prisma.task.count({
          where: { subUnitId: currentUser.subUnitId },
        }),
        prisma.task.count({
          where: { subUnitId: currentUser.subUnitId, status: 'WAITING' },
        }),
        prisma.task.count({
          where: {
            subUnitId: currentUser.subUnitId,
            status: 'DONE',
            completedAt: { gte: today, lt: tomorrow },
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
      ]);

      const leaderStats: LeaderDashboardStats = {
        teamTasks,
        pendingTasks,
        completedToday,
        teamMembers,
        pendingLeaves,
        weeklyProgress: [],
      };

      return NextResponse.json<ApiResponse<LeaderDashboardStats>>({
        success: true,
        data: leaderStats,
      });
    }

    // Admin/General dashboard
    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      totalUsers,
      activeUsers,
      pendingLeaves,
      totalCars,
      availableCars,
    ] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: 'WAITING' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { status: 'DONE' } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.leave.count({ where: { status: 'PENDING' } }),
      prisma.car.count(),
      prisma.car.count({ where: { status: 'AVAILABLE' } }),
    ]);

    const stats: DashboardStats = {
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      totalUsers,
      activeUsers,
      pendingLeaves,
      totalCars,
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
