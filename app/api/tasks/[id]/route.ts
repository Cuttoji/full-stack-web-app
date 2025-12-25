import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { ApiResponse, UpdateTaskRequest, Task, TaskStatus } from '@/lib/types';
import { USE_MOCK_DB } from '@/lib/mockDb';
import { mockTasks } from '@/lib/mockData';

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

    if (USE_MOCK_DB) {
      const task = mockTasks.find(t => t.id === id);
      
      if (!task) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'ไม่พบงาน' },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse<Task>>({
        success: true,
        data: task as Task,
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
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

    if (USE_MOCK_DB) {
      const task = mockTasks.find(t => t.id === id);
      
      if (!task) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'ไม่พบงาน' },
          { status: 404 }
        );
      }

      // Mock update - return updated task
      const updatedTask = {
        ...task,
        ...body,
        status: body.status || task.status,
        updatedAt: new Date(),
      };

      return NextResponse.json<ApiResponse<Task>>({
        success: true,
        data: updatedTask as Task,
        message: 'อัปเดตงานสำเร็จ (Mock)',
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตงาน' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete task
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

    if (USE_MOCK_DB) {
      const taskIndex = mockTasks.findIndex(t => t.id === id);
      
      if (taskIndex === -1) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'ไม่พบงาน' },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'ลบงานสำเร็จ (Mock)',
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบงาน' },
      { status: 500 }
    );
  }
}
