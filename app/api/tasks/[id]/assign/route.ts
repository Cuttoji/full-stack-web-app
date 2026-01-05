import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, AssignTaskRequest, Role, ConflictResult } from '@/lib/types';
import { notifyTaskAssignment } from '@/lib/notifications';

// POST /api/tasks/[id]/assign - Assign task to technicians and car
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

    if (!hasPermission(currentUser.role as Role, 'canAssignTasks')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการมอบหมายงาน' },
        { status: 403 }
      );
    }

    const body: Omit<AssignTaskRequest, 'taskId'> = await request.json();
    const { assigneeIds, carId } = body;

    // Get task details
    const task = await prisma.task.findUnique({
      where: { id },
      include: { subUnit: true },
    });

    if (!task) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบงาน' },
        { status: 404 }
      );
    }

    // Check for conflicts before assigning
    if (assigneeIds && assigneeIds.length > 0) {
      const userConflicts = await prisma.task.findMany({
        where: {
          id: { not: id },
          status: { in: ['WAITING', 'IN_PROGRESS'] },
          assignments: {
            some: { userId: { in: assigneeIds } },
          },
          OR: [
            {
              AND: [
                { startDate: { lte: task.endDate } },
                { endDate: { gte: task.startDate } },
              ],
            },
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

      if (userConflicts.length > 0) {
        const conflicts: ConflictResult = {
          hasConflict: true,
          userConflicts: [],
          carConflicts: [],
        };

        for (const conflictTask of userConflicts) {
          for (const assignment of conflictTask.assignments) {
            if (assigneeIds.includes(assignment.userId)) {
              const existingConflict = conflicts.userConflicts.find(
                (c) => c.userId === assignment.userId
              );
              if (existingConflict) {
                existingConflict.conflictingTasks.push({
                  taskId: conflictTask.id,
                  jobNumber: conflictTask.jobNumber,
                  title: conflictTask.title,
                  startDate: conflictTask.startDate,
                  endDate: conflictTask.endDate,
                });
              } else {
                conflicts.userConflicts.push({
                  userId: assignment.userId,
                  userName: assignment.user.name,
                  conflictingTasks: [
                    {
                      taskId: conflictTask.id,
                      jobNumber: conflictTask.jobNumber,
                      title: conflictTask.title,
                      startDate: conflictTask.startDate,
                      endDate: conflictTask.endDate,
                    },
                  ],
                });
              }
            }
          }
        }

        return NextResponse.json<ApiResponse<ConflictResult>>({
          success: false,
          data: conflicts,
          error: 'พบการจองซ้ำซ้อน กรุณาตรวจสอบ',
        });
      }
    }

    // Check car conflicts
    if (carId) {
      const carConflicts = await prisma.task.findMany({
        where: {
          id: { not: id },
          carId,
          status: { in: ['WAITING', 'IN_PROGRESS'] },
          AND: [
            { startDate: { lte: task.endDate } },
            { endDate: { gte: task.startDate } },
          ],
        },
        include: {
          car: true,
        },
      });

      if (carConflicts.length > 0) {
        const car = await prisma.car.findUnique({ where: { id: carId } });
        return NextResponse.json<ApiResponse<ConflictResult>>({
          success: false,
          data: {
            hasConflict: true,
            userConflicts: [],
            carConflicts: [
              {
                carId,
                carName: car?.name || '',
                plateNumber: car?.plateNumber || '',
                conflictingTasks: carConflicts.map((t: typeof carConflicts[number]) => ({
                  taskId: t.id,
                  jobNumber: t.jobNumber,
                  title: t.title,
                  startDate: t.startDate,
                  endDate: t.endDate,
                })),
              },
            ],
          },
          error: 'รถคันนี้ถูกจองในช่วงเวลาดังกล่าวแล้ว',
        });
      }
    }

    // Remove existing assignments
    await prisma.taskAssignment.deleteMany({
      where: { taskId: id },
    });

    // Create new assignments
    if (assigneeIds && assigneeIds.length > 0) {
      await prisma.taskAssignment.createMany({
        data: assigneeIds.map((userId, index) => ({
          taskId: id,
          userId,
          isLead: index === 0,
        })),
      });

      // Create notifications using notification service
      await notifyTaskAssignment(
        id,
        task.title,
        assigneeIds,
        currentUser.name || 'ผู้ใช้ระบบ'
      );
    }

    // Update car
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { carId },
      include: {
        subUnit: true,
        car: true,
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedTask,
      message: 'มอบหมายงานสำเร็จ',
    });
  } catch (error) {
    console.error('Assign task error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการมอบหมายงาน' },
      { status: 500 }
    );
  }
}
