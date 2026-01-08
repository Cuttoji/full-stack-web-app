import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTokenFromHeader, verifyToken, verifyPassword, hashPassword, hasPermission } from '@/lib/auth';
import { ApiResponse, Role } from '@/lib/types';

// PATCH /api/users/[id]/password - change user password
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
      return NextResponse.json<ApiResponse>({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string };

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    // Only allow self-change or admin
    const isSelf = currentUser.id === id;
    const canManage = hasPermission(currentUser.role as Role, 'canManageUsers');
    if (!isSelf && !canManage) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'คุณไม่มีสิทธิ์ในการเปลี่ยนรหัสผ่านของผู้ใช้นี้' }, { status: 403 });
    }

    // If self, require currentPassword
    if (isSelf) {
      if (!currentPassword) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'กรุณาระบุรหัสผ่านปัจจุบัน' }, { status: 400 });
      }

      const dbUser = await prisma.user.findUnique({ where: { id } });
      if (!dbUser) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบผู้ใช้' }, { status: 404 });
      }

      const ok = await verifyPassword(currentPassword, dbUser.password || '');
      if (!ok) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 403 });
      }
    }

    // Update password
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    return NextResponse.json<ApiResponse>({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error) {
    console.error('Change password error:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 });
  }
}
