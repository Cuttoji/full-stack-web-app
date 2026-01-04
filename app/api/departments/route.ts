import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, Role } from '@/lib/types';
import prisma from '@/lib/prisma';

// GET /api/departments - Get all departments
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

    const departments = await prisma.department.findMany({
      include: {
        subUnits: true,
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
      data: departments,
    });
  } catch (error) {
    console.error('Get departments error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนก' },
      { status: 500 }
    );
  }
}

// POST /api/departments - Create department (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || !hasPermission(currentUser.role as Role, 'canManageDepartments')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการสร้างแผนก' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณากรอกชื่อแผนก' },
        { status: 400 }
      );
    }

    // Check if department with same name already exists
    const existingDept = await prisma.department.findUnique({
      where: { name },
    });

    if (existingDept) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'แผนกนี้มีอยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }

    const newDept = await prisma.department.create({
      data: {
        name,
      },
      include: {
        subUnits: true,
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: newDept,
      message: 'สร้างแผนกสำเร็จ',
    });
  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างแผนก' },
      { status: 500 }
    );
  }
}
