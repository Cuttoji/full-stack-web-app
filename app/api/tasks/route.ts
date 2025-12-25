import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, CreateTaskRequest, Task, Role, PaginatedResponse, TaskStatus } from '@/lib/types';
import { generateJobNumber } from '@/lib/utils';
import { USE_MOCK_DB, mockDb } from '@/lib/mockDb';
import { mockTasks } from '@/lib/mockData';

// GET /api/tasks - Get all tasks (with filters)
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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') as TaskStatus | null;
    const subUnitId = searchParams.get('subUnitId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (USE_MOCK_DB) {
      let filteredTasks = [...mockTasks];

      // Apply filters
      if (search) {
        const searchLower = search.toLowerCase();
        filteredTasks = filteredTasks.filter(t => 
          t.title.toLowerCase().includes(searchLower) ||
          t.jobNumber.toLowerCase().includes(searchLower) ||
          t.customerName?.toLowerCase().includes(searchLower)
        );
      }
      if (status) {
        filteredTasks = filteredTasks.filter(t => t.status === status);
      }
      if (subUnitId) {
        filteredTasks = filteredTasks.filter(t => t.subUnitId === subUnitId);
      }
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        filteredTasks = filteredTasks.filter(t => {
          const taskDate = new Date(t.scheduledDate);
          return taskDate >= start && taskDate <= end;
        });
      }

      // Role-based filtering
      if (currentUser.role === 'TECH') {
        filteredTasks = filteredTasks.filter(t => 
          t.assignments.some(a => a.userId === currentUser.id)
        );
      } else if (currentUser.role === 'LEADER' && currentUser.subUnitId) {
        filteredTasks = filteredTasks.filter(t => t.subUnitId === currentUser.subUnitId);
      } else if (currentUser.role === 'SALES') {
        filteredTasks = filteredTasks.filter(t => t.createdById === currentUser.id);
      }

      const total = filteredTasks.length;
      const paginatedTasks = filteredTasks.slice((page - 1) * limit, page * limit);

      return NextResponse.json<ApiResponse<PaginatedResponse<Task>>>({
        success: true,
        data: {
          data: paginatedTasks as Task[],
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
    console.error('Get tasks error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงาน' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task (Finance/Admin only)
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

    if (!hasPermission(currentUser.role as Role, 'canCreateTasks')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการสร้างงาน' },
        { status: 403 }
      );
    }

    const body: CreateTaskRequest = await request.json();
    const {
      title,
      description,
      location,
      customerName,
      customerPhone,
      startDate,
      endDate,
      startTime,
      endTime,
      subUnitId,
      priority,
    } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณากรอกข้อมูลที่จำเป็น' },
        { status: 400 }
      );
    }

    if (USE_MOCK_DB) {
      const jobNumber = generateJobNumber();
      const newTask = {
        id: `task-${Date.now()}`,
        jobNumber,
        title,
        description: description || '',
        location: location || '',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        scheduledDate: new Date(startDate),
        startTime: startTime || '09:00',
        endTime: endTime || '17:00',
        status: 'WAITING' as TaskStatus,
        priority: priority || 1,
        subUnitId: subUnitId || null,
        subUnit: null,
        carId: null,
        car: null,
        createdById: currentUser.id,
        createdBy: { id: currentUser.id, name: currentUser.name, email: currentUser.email },
        assignments: [],
        images: [],
        printerLogs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return NextResponse.json<ApiResponse<Task>>({
        success: true,
        data: newTask as Task,
        message: 'สร้างงานสำเร็จ (Mock)',
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างงาน' },
      { status: 500 }
    );
  }
}
