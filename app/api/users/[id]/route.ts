import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeader, hashPassword, hasPermission } from '@/lib/auth';
import { ApiResponse, UpdateUserRequest, User, Role } from '@/lib/types';

// GET /api/users/[id] - Get user by ID
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        departmentId: true,
        subUnitId: true,
        leaveQuota: true,
        leaveUsed: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        subUnit: true,
      },
    });

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<User>>({
      success: true,
      data: user as any,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update user
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

    // Only admin can update other users, or user can update themselves
    if (currentUser.id !== id && !hasPermission(currentUser.role as Role, 'canManageUsers')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลผู้ใช้นี้' },
        { status: 403 }
      );
    }

    const body: UpdateUserRequest = await request.json();
    const { newPassword, ...updateData } = body;

    // If updating role or department, must be admin
    if ((updateData.role || updateData.departmentId || updateData.subUnitId) && 
        !hasPermission(currentUser.role as Role, 'canManageUsers')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการเปลี่ยนบทบาทหรือแผนก' },
        { status: 403 }
      );
    }

    const data: any = { ...updateData };

    if (newPassword) {
      data.password = await hashPassword(newPassword);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        employeeId: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        departmentId: true,
        subUnitId: true,
        leaveQuota: true,
        leaveUsed: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        subUnit: true,
      },
    });

    return NextResponse.json<ApiResponse<User>>({
      success: true,
      data: user as any,
      message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ',
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || !hasPermission(currentUser.role as Role, 'canManageUsers')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการลบผู้ใช้' },
        { status: 403 }
      );
    }

    // Soft delete - just deactivate
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'ลบผู้ใช้สำเร็จ',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบผู้ใช้' },
      { status: 500 }
    );
  }
}
