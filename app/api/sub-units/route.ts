import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, Role } from '@/lib/types';
import { USE_MOCK_DB, mockDb } from '@/lib/mockDb';

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

    if (USE_MOCK_DB) {
      const where: Record<string, unknown> = {};
      if (departmentId) where.departmentId = departmentId;

      const subUnits = await mockDb.subUnits.findMany({ where });
      return NextResponse.json<ApiResponse>({
        success: true,
        data: subUnits,
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
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

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: 'mock-sub-unit', name, type, departmentId },
      message: 'สร้างกลุ่มย่อยสำเร็จ (Mock)',
    });
  } catch (error) {
    console.error('Create sub-unit error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างกลุ่มย่อย' },
      { status: 500 }
    );
  }
}
