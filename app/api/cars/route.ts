import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withPermission } from '@/lib/middleware';
import { ApiResponse, Car, PaginatedResponse, AuthUser } from '@/lib/types';
import { createCarSchema, getCarsQuerySchema, validateRequest, validateQueryParams } from '@/lib/validations';
import prisma from '@/lib/prisma';

// GET /api/cars - Get all cars
export const GET = withAuth(async (request: NextRequest, currentUser: AuthUser) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryValidation = validateQueryParams(getCarsQuerySchema, searchParams);
    if (!queryValidation.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: queryValidation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    const { page, limit, status, search } = queryValidation.data;

    const whereClause: {
      status?: typeof status;
      OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { plateNumber: { contains: string; mode: 'insensitive' } }>;
    } = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { plateNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [cars, total] = await Promise.all([
      prisma.car.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.car.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json<ApiResponse<PaginatedResponse<Car>>>({
      success: true,
      data: {
        data: cars as Car[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get cars error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรถ' },
      { status: 500 }
    );
  }
});

// POST /api/cars - Create new car (Head Tech/Admin only)
export const POST = withPermission('canManageCars', async (request: NextRequest, currentUser: AuthUser) => {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(createCarSchema, body);
    if (!validation.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    const { plateNumber, name, type, description } = validation.data;

    // Check if plate number exists
    const existingCar = await prisma.car.findUnique({
      where: { plateNumber },
    });

    if (existingCar) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ทะเบียนรถนี้มีในระบบแล้ว' },
        { status: 400 }
      );
    }

    const newCar = await prisma.car.create({
      data: {
        plateNumber,
        licensePlate: plateNumber,
        name,
        type: type || 'รถยนต์',
        status: 'AVAILABLE',
        mileage: 0,
        description: description || null,
      },
    });

    return NextResponse.json<ApiResponse<Car>>({
      success: true,
      data: newCar as Car,
      message: 'เพิ่มรถสำเร็จ',
    });
  } catch (error) {
    console.error('Create car error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการเพิ่มรถ' },
      { status: 500 }
    );
  }
});
