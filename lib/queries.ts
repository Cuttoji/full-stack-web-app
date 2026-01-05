/**
 * Optimized database query utilities
 * Provides common query patterns with performance optimizations
 */

import { prisma } from './prisma';
import { Prisma, TaskStatus, LeaveStatus } from '@prisma/client';
import { getCache, CacheKeys, CacheTTL } from './cache';

// ==================== USER QUERIES ====================

/**
 * Get user with minimal data for authentication
 */
export async function getUserForAuth(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      employeeId: true,
      email: true,
      password: true,
      name: true,
      role: true,
      departmentId: true,
      subUnitId: true,
      isActive: true,
    },
  });
}

/**
 * Get user by ID with caching
 */
export async function getUserById(id: string) {
  const cache = getCache();
  const cacheKey = CacheKeys.user(id);
  
  return cache.getOrSet(
    cacheKey,
    () => prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        departmentId: true,
        subUnitId: true,
        isActive: true,
        department: {
          select: { id: true, name: true },
        },
        subUnit: {
          select: { id: true, name: true, type: true },
        },
      },
    }),
    CacheTTL.MEDIUM
  );
}

/**
 * Get users list with pagination and filters
 */
export async function getUsersList(options: {
  departmentId?: string;
  subUnitId?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  const { departmentId, subUnitId, role, isActive = true, page = 1, limit = 50 } = options;
  
  const where: Prisma.UserWhereInput = {
    isActive,
    ...(departmentId && { departmentId }),
    ...(subUnitId && { subUnitId }),
    ...(role && { role: role as Prisma.EnumRoleFilter['equals'] }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        subUnitId: true,
        isActive: true,
        department: {
          select: { id: true, name: true },
        },
        subUnit: {
          select: { id: true, name: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ==================== TASK QUERIES ====================

/**
 * Get tasks with optimized includes
 */
export async function getTasksOptimized(options: {
  userId?: string;
  subUnitId?: string;
  status?: TaskStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const { userId, subUnitId, status, startDate, endDate, page = 1, limit = 20 } = options;

  const where: Prisma.TaskWhereInput = {
    ...(status && { status }),
    ...(subUnitId && { subUnitId }),
    ...(userId && {
      assignments: {
        some: { userId },
      },
    }),
    ...(startDate && endDate && {
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    }),
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
        id: true,
        jobNumber: true,
        title: true,
        description: true,
        location: true,
        customerName: true,
        status: true,
        startDate: true,
        endDate: true,
        scheduledDate: true,
        createdAt: true,
        subUnit: {
          select: { id: true, name: true, type: true },
        },
        car: {
          select: { id: true, name: true, plateNumber: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        assignments: {
          select: {
            isPrimary: true,
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        _count: {
          select: { images: true, printerLogs: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { startDate: 'asc' },
      ],
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Get task detail with all related data
 */
export async function getTaskDetail(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      subUnit: true,
      car: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      assignments: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true, phone: true },
          },
        },
      },
      images: {
        orderBy: { createdAt: 'desc' },
      },
      printerLogs: {
        include: {
          technician: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

// ==================== DASHBOARD QUERIES ====================

/**
 * Get dashboard statistics with caching
 */
export async function getDashboardStats(userId: string, role: string) {
  const cache = getCache();
  const cacheKey = CacheKeys.dashboardStats(userId);

  return cache.getOrSet(
    cacheKey,
    async () => {
      const isManager = ['ADMIN', 'HEAD_TECH', 'LEADER', 'FINANCE_LEADER', 'SALES_LEADER'].includes(role);
      
      const userFilter = isManager ? {} : {
        assignments: { some: { userId } },
      };

      const [
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        pendingLeaves,
        upcomingTasks,
      ] = await Promise.all([
        prisma.task.count({ where: userFilter }),
        prisma.task.count({ where: { ...userFilter, status: 'WAITING' } }),
        prisma.task.count({ where: { ...userFilter, status: 'IN_PROGRESS' } }),
        prisma.task.count({ where: { ...userFilter, status: 'DONE' } }),
        prisma.leave.count({
          where: isManager
            ? { status: 'PENDING' }
            : { userId, status: 'PENDING' },
        }),
        prisma.task.findMany({
          where: {
            ...userFilter,
            status: { in: ['WAITING', 'IN_PROGRESS'] },
            startDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
            },
          },
          select: {
            id: true,
            jobNumber: true,
            title: true,
            startDate: true,
            status: true,
          },
          take: 5,
          orderBy: { startDate: 'asc' },
        }),
      ]);

      return {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        pendingLeaves,
        upcomingTasks,
      };
    },
    CacheTTL.SHORT
  );
}

// ==================== LEAVE QUERIES ====================

/**
 * Get leave quota for a user
 */
export async function getLeaveQuota(userId: string, year: number) {
  const cache = getCache();
  const cacheKey = CacheKeys.leaveQuota(userId, year);

  return cache.getOrSet(
    cacheKey,
    () => prisma.leaveQuota.findMany({
      where: { userId, year },
      select: {
        leaveType: true,
        totalQuota: true,
        usedDays: true,
        pendingDays: true,
      },
    }),
    CacheTTL.LONG
  );
}

/**
 * Get leaves with filters
 */
export async function getLeavesOptimized(options: {
  userId?: string;
  status?: LeaveStatus;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const { userId, status, type, startDate, endDate, page = 1, limit = 20 } = options;

  const where: Prisma.LeaveWhereInput = {
    ...(userId && { userId }),
    ...(status && { status }),
    ...(type && { type: type as Prisma.EnumLeaveTypeFilter['equals'] }),
    ...(startDate && endDate && {
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    }),
  };

  const [leaves, total] = await Promise.all([
    prisma.leave.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        reason: true,
        durationType: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, employeeId: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.leave.count({ where }),
  ]);

  return { leaves, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ==================== DEPARTMENT QUERIES ====================

/**
 * Get all departments with caching
 */
export async function getDepartmentsWithCache() {
  const cache = getCache();
  const cacheKey = CacheKeys.departments();

  return cache.getOrSet(
    cacheKey,
    () => prisma.department.findMany({
      include: {
        subUnits: {
          select: { id: true, name: true, type: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    CacheTTL.HOUR
  );
}

// ==================== NOTIFICATION QUERIES ====================

/**
 * Get unread notifications count
 */
export async function getUnreadNotificationsCount(userId: string) {
  const cache = getCache();
  const cacheKey = CacheKeys.notificationsCount(userId);

  return cache.getOrSet(
    cacheKey,
    () => prisma.notification.count({
      where: { userId, isRead: false },
    }),
    CacheTTL.SHORT
  );
}
