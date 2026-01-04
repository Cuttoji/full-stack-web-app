import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { ApiResponse, UpdateTaskRequest, Task, TaskStatus } from '@/lib/types';
import prisma from '@/lib/prisma';

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
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const body: UpdateTaskRequest = await request.json();

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบงาน' },
        { status: 404 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status as TaskStatus }),
        ...(body.location && { location: body.location }),
        ...(body.customerName && { customerName: body.customerName }),
        ...(body.customerPhone && { customerPhone: body.customerPhone }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate && { endDate: new Date(body.endDate) }),
        ...(body.startTime && { startTime: body.startTime }),
        ...(body.endTime && { endTime: body.endTime }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.status === 'DONE' && { completedAt: new Date() }),
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
      // Permanent delete
      await prisma.task.delete({
        where: { id },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'ลบงานถาวรสำเร็จ',
      });
    } else {
      // Soft delete - update status to CANCELLED
      const deletedTask = await prisma.task.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
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
