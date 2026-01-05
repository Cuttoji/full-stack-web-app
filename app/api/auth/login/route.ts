import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { generateToken, verifyPassword } from '@/lib/auth';
import { ApiResponse, LoginResponse, Role } from '@/lib/types';
import { loginSchema, validateRequest } from '@/lib/validations';
import prisma from '@/lib/prisma';

// Rate limiter: 5 requests per minute per IP
const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// POST /api/auth/login - Login user
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    await rateLimiter.consume(ip);
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'ขออภัย คุณส่งคำขอมากเกินไป กรุณารอสักครู่' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(loginSchema, body);
    if (!validation.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
        subUnit: true,
      },
    });

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'บัญชีของคุณถูกระงับ' },
        { status: 403 }
      );
    }

    // Parse permissions from JSON
    const userPermissions = user.permissions as Record<string, boolean> | null;

    const token = generateToken({
      id: user.id,
      employeeId: user.employeeId,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      departmentId: user.departmentId || undefined,
      subUnitId: user.subUnitId || undefined,
      permissions: userPermissions || undefined,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json<ApiResponse<LoginResponse>>({
      success: true,
      data: {
        user: userWithoutPassword as unknown as LoginResponse['user'],
        token,
      },
      message: 'เข้าสู่ระบบสำเร็จ',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
