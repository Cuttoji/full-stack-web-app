import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withPermission } from '@/lib/middleware';
import { ApiResponse, Task, PaginatedResponse, AuthUser } from '@/lib/types';
import { generateJobNumber } from '@/lib/utils';
import { createTaskSchema, getTasksQuerySchema, validateRequest, validateQueryParams } from '@/lib/validations';
import prisma from '@/lib/prisma';

// GET /api/tasks - Get all tasks (with filters)
export const GET = withAuth(async (request: NextRequest, currentUser: AuthUser) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryValidation = validateQueryParams(getTasksQuerySchema, searchParams);
    if (!queryValidation.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: queryValidation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    const { page, limit, search, status, subUnitId, startDate, endDate } = queryValidation.data;
    
    // Check if requesting trash (deleted tasks)
    const showTrash = searchParams.get('trash') === 'true';

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    
    // Filter by trash status
    if (showTrash) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (subUnitId) {
      where.subUnitId = subUnitId;
    }
    if (startDate && endDate) {
      where.AND = [
        ...(where.AND || []),
        { scheduledDate: { not: null } },
        {
          scheduledDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      ];
    }

    // Role-based filtering
    if (currentUser.role === 'TECH') {
      where.assignments = { some: { userId: currentUser.id } };
    } else if (currentUser.role === 'LEADER' && currentUser.subUnitId) {
      where.subUnitId = currentUser.subUnitId;
    } else if (currentUser.role === 'SALES') {
      where.createdById = currentUser.id;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subUnit: true,
          car: true,
          createdBy: { select: { id: true, name: true, email: true } },
          assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
          images: true,
          printerLogs: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json<ApiResponse<PaginatedResponse<Task>>>({
      success: true,
      data: {
        data: tasks as unknown as Task[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลงาน';
    return NextResponse.json<ApiResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});

// POST /api/tasks - Create new task (Finance/Admin only)
export const POST = withPermission('canCreateTasks', async (request: NextRequest, currentUser: AuthUser) => {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(createTaskSchema, body);
    if (!validation.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }
    
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
    } = validation.data;

    const jobNumber = generateJobNumber();
    const newTask = await prisma.task.create({
      data: {
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
        status: 'WAITING',
        priority: priority || 1,
        subUnitId: subUnitId || null,
        createdById: currentUser.id,
      },
      include: {
        subUnit: true,
        car: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
        images: true,
        printerLogs: true,
      },
    });

    return NextResponse.json<ApiResponse<Task>>({
      success: true,
      data: newTask as unknown as Task,
      message: 'สร้างงานสำเร็จ',
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างงาน' },
      { status: 500 }
    );
  }
});
