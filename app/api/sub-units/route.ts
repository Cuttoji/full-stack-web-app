import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, Role } from '@/lib/types';
import prisma from '@/lib/prisma';

// GET /api/sub-units - Get all sub-units
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
    const departmentId = searchParams.get('departmentId');

    const whereClause: { departmentId?: string } = {};
    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    const subUnits = await prisma.subUnit.findMany({
      where: whereClause,
      include: {
        department: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: subUnits,
    });
  } catch (error) {
    console.error('Get sub-units error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลกลุ่มย่อย' },
      { status: 500 }
    );
  }
}

// POST /api/sub-units - Create sub-unit (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || !hasPermission(currentUser.role as Role, 'canManageDepartments')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการสร้างกลุ่มย่อย' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, departmentId } = body;

    if (!name || !type || !departmentId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบแผนกที่ระบุ' },
        { status: 404 }
      );
    }

    const newSubUnit = await prisma.subUnit.create({
      data: {
        name,
        type,
        departmentId,
      },
      include: {
        department: true,
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: newSubUnit,
      message: 'สร้างกลุ่มย่อยสำเร็จ',
    });
  } catch (error) {
    console.error('Create sub-unit error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างกลุ่มย่อย' },
      { status: 500 }
    );
  }
}
