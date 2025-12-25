import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, Role } from '@/lib/types';
import { USE_MOCK_DB } from '@/lib/mockDb';
import { mockDepartments, mockSubUnits } from '@/lib/mockData';

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

    if (USE_MOCK_DB) {
      const departments = mockDepartments.map(dept => ({
        ...dept,
        subUnits: mockSubUnits.filter(s => s.departmentId === dept.id),
        _count: { users: 6 },
      }));

      return NextResponse.json<ApiResponse>({
        success: true,
        data: departments,
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
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

    if (USE_MOCK_DB) {
      const newDept = {
        id: `dept-${Date.now()}`,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return NextResponse.json<ApiResponse>({
        success: true,
        data: newDept,
        message: 'สร้างแผนกสำเร็จ (Mock)',
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างแผนก' },
      { status: 500 }
    );
  }
}
