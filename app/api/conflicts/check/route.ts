import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { ApiResponse, ConflictCheckRequest, ConflictResult } from '@/lib/types';

// POST /api/conflicts/check - Check for conflicts
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

    const body: ConflictCheckRequest = await request.json();
    const { startDate, endDate, assigneeIds, carId, excludeTaskId } = body;

    if (!startDate || !endDate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาระบุวันที่' },
        { status: 400 }
      );
    }

    const result: ConflictResult = {
      hasConflict: false,
      userConflicts: [],
      carConflicts: [],
    };

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check user conflicts
    if (assigneeIds && assigneeIds.length > 0) {
      const userConflictTasks = await prisma.task.findMany({
        where: {
          ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
          status: { in: ['WAITING', 'IN_PROGRESS'] },
          assignments: {
            some: { userId: { in: assigneeIds } },
          },
          AND: [
            { startDate: { lte: end } },
            { endDate: { gte: start } },
          ],
        },
        include: {
          assignments: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      for (const task of userConflictTasks) {
        for (const assignment of task.assignments) {
          if (assigneeIds.includes(assignment.userId)) {
            const existingConflict = result.userConflicts.find(
              (c) => c.userId === assignment.userId
            );
            if (existingConflict) {
              existingConflict.conflictingTasks.push({
                taskId: task.id,
                jobNumber: task.jobNumber,
                title: task.title,
                startDate: task.startDate,
                endDate: task.endDate,
              });
            } else {
              result.userConflicts.push({
                userId: assignment.userId,
                userName: assignment.user.name,
                conflictingTasks: [
                  {
                    taskId: task.id,
                    jobNumber: task.jobNumber,
                    title: task.title,
                    startDate: task.startDate,
                    endDate: task.endDate,
                  },
                ],
              });
            }
          }
        }
      }
    }

    // Check car conflicts - Show as warning only, don't block task creation
    if (carId) {
      const carConflictTasks = await prisma.task.findMany({
        where: {
          ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
          carId,
          status: { in: ['WAITING', 'IN_PROGRESS'] },
          AND: [
            { startDate: { lte: end } },
            { endDate: { gte: start } },
          ],
        },
        include: {
          car: true,
        },
      });

      if (carConflictTasks.length > 0) {
        const car = await prisma.car.findUnique({ where: { id: carId } });
        result.carConflicts.push({
          carId,
          carName: car?.licensePlate || car?.name || '',
          plateNumber: car?.licensePlate || car?.plateNumber || '',
          conflictingTasks: carConflictTasks.map((t) => ({
            taskId: t.id,
            jobNumber: t.jobNumber,
            title: t.title,
            startDate: t.startDate,
            endDate: t.endDate,
          })),
        });
      }
    }

    // Check for users on leave
    if (assigneeIds && assigneeIds.length > 0) {
      const usersOnLeave = await prisma.leave.findMany({
        where: {
          userId: { in: assigneeIds },
          status: 'APPROVED',
          AND: [
            { startDate: { lte: end } },
            { endDate: { gte: start } },
          ],
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      });

      for (const leave of usersOnLeave) {
        const existingConflict = result.userConflicts.find(
          (c) => c.userId === leave.userId
        );
        if (existingConflict) {
          existingConflict.conflictingTasks.push({
            taskId: leave.id,
            jobNumber: 'LEAVE',
            title: `ลา: ${leave.user.name}`,
            startDate: leave.startDate,
            endDate: leave.endDate,
          });
        } else {
          result.userConflicts.push({
            userId: leave.userId,
            userName: leave.user.name,
            conflictingTasks: [
              {
                taskId: leave.id,
                jobNumber: 'LEAVE',
                title: `ลา: ${leave.user.name}`,
                startDate: leave.startDate,
                endDate: leave.endDate,
              },
            ],
          });
        }
      }
    }

    // Set hasConflict only for user conflicts (car conflicts are warnings only)
    result.hasConflict = result.userConflicts.length > 0;

    return NextResponse.json<ApiResponse<ConflictResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Conflict check error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบความขัดแย้ง' },
      { status: 500 }
    );
  }
}
