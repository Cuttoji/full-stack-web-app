import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, Task, TaskStatus, Role } from '@/lib/types';
import { updateTaskSchema, validateRequest, idSchema } from '@/lib/validations';
import prisma from '@/lib/prisma';

// Validate task ID
function validateTaskId(id: string): { valid: true } | { valid: false; error: string } {
  const result = idSchema.safeParse(id);
  if (!result.success) {
    return { valid: false, error: 'รหัสงานไม่ถูกต้อง' };
  }
  return { valid: true };
}

// GET /api/tasks/[id] - Get task by ID
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        subUnit: true,
        car: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
              },
            },
          },
        },
        images: true,
        printerLogs: true,
      },
    });

    if (!task) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบงาน' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Task>>({
      success: true,
      data: task as unknown as Task,
    });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงาน' },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Update task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate task ID
    const idValidation = validateTaskId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: idValidation.error },
        { status: 400 }
      );
    }
    
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(updateTaskSchema, body);
    if (!validation.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    const validatedData = validation.data;

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบงาน' },
        { status: 404 }
      );
    }
    
    // Check edit permission - only allow edit if user has permission or is creator
    const canEdit = hasPermission(currentUser.role as Role, 'canEditTaskDetails') ||
                   existingTask.createdById === currentUser.id;
    
    // Status change validation - certain roles can change to certain statuses
    if (validatedData.status && validatedData.status !== existingTask.status) {
      // TECH can only change to IN_PROGRESS or DONE for assigned tasks
      if (currentUser.role === Role.TECH) {
        const isAssigned = await prisma.taskAssignment.findFirst({
          where: { taskId: id, userId: currentUser.id },
        });
        if (!isAssigned) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: 'คุณไม่ได้รับมอบหมายงานนี้' },
            { status: 403 }
          );
        }
        if (validatedData.status === TaskStatus.CANCELLED && !hasPermission(currentUser.role as Role, 'canManageTasks')) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: 'คุณไม่มีสิทธิ์ยกเลิกงาน' },
            { status: 403 }
          );
        }
      }
    }
    
    if (!canEdit && !validatedData.status) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์แก้ไขงานนี้' },
        { status: 403 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.status && { status: validatedData.status as TaskStatus }),
        ...(validatedData.location && { location: validatedData.location }),
        ...(validatedData.customerName && { customerName: validatedData.customerName }),
        ...(validatedData.customerPhone && { customerPhone: validatedData.customerPhone }),
        ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
        ...(validatedData.endDate && { endDate: new Date(validatedData.endDate) }),
        ...(validatedData.startTime && { startTime: validatedData.startTime }),
        ...(validatedData.endTime && { endTime: validatedData.endTime }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
        ...(validatedData.status === 'DONE' && { completedAt: new Date() }),
        updatedAt: new Date(),
      },
      include: {
        subUnit: true,
        car: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json<ApiResponse<Task>>({
      success: true,
      data: updatedTask as unknown as Task,
      message: 'อัปเดตงานสำเร็จ',
    });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตงาน' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Soft delete task (move to trash) or permanent delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate task ID
    const idValidation = validateTaskId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: idValidation.error },
        { status: 400 }
      );
    }
    
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }
    
    // Check delete permission
    if (!hasPermission(currentUser.role as Role, 'canDeleteTasks')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ลบงาน' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบงาน' },
        { status: 404 }
      );
    }

    if (permanent) {
      // Permanent delete - only if already in trash
      if (!existingTask.deletedAt) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'กรุณาย้ายงานไปถังขยะก่อนลบถาวร' },
          { status: 400 }
        );
      }
      
      await prisma.task.delete({
        where: { id },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'ลบงานถาวรสำเร็จ',
      });
    } else {
      // Soft delete - set deletedAt timestamp
      const deletedTask = await prisma.task.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: currentUser.id,
        },
      });

      return NextResponse.json<ApiResponse<Task>>({
        success: true,
        data: deletedTask as unknown as Task,
        message: 'ย้ายงานไปถังขยะสำเร็จ',
      });
    }
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบงาน' },
      { status: 500 }
    );
  }
}
