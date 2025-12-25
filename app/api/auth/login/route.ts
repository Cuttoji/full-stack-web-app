import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { ApiResponse, LoginResponse, Role } from '@/lib/types';
import { USE_MOCK_DB } from '@/lib/mockDb';
import { findUserByEmail } from '@/lib/mockData';

// POST /api/auth/login - Login user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    if (USE_MOCK_DB) {
      // Mock mode - accept any password for demo users
      const user = findUserByEmail(email);
      
      if (!user) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบทดสอบ' },
          { status: 401 }
        );
      }

      if (!user.isActive) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'บัญชีของคุณถูกระงับ' },
          { status: 403 }
        );
      }

      const token = generateToken({
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        name: user.name,
        role: user.role as Role,
        departmentId: user.departmentId || undefined,
        subUnitId: user.subUnitId || undefined,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;

      return NextResponse.json<ApiResponse<LoginResponse>>({
        success: true,
        data: {
          user: userWithoutPassword as LoginResponse['user'],
          token,
        },
        message: 'เข้าสู่ระบบสำเร็จ (โหมดทดสอบ)',
      });
    }

    // Real DB mode - would use Prisma (not configured)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured. Use mock mode.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
