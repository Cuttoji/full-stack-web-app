import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { ApiResponse } from '@/lib/types';
import prisma from '@/lib/prisma';
import { authLogger } from '@/lib/logger';

// Request password reset schema
const requestResetSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
});

// Reset password schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
});

// POST /api/auth/reset-password - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = requestResetSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json<ApiResponse>(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      authLogger.warn('Password reset requested for non-existent email', { data: { email } });
      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'หากอีเมลนี้มีในระบบ คุณจะได้รับลิงก์สำหรับรีเซ็ตรหัสผ่าน',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Token expires in 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Store token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      },
    });

    authLogger.info('Password reset token generated', { 
      userId: user.id, 
      data: { 
        email: user.email,
        expiresAt: resetTokenExpiry.toISOString(),
      },
    });

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    // await sendEmail({
    //   to: user.email,
    //   subject: 'รีเซ็ตรหัสผ่าน - TaskFlow',
    //   html: `<p>คลิกลิงก์นี้เพื่อรีเซ็ตรหัสผ่าน: <a href="${resetUrl}">${resetUrl}</a></p>`,
    // });

    // For development, log the token
    if (process.env.NODE_ENV === 'development') {
      console.log('Reset token (dev only):', resetToken);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'หากอีเมลนี้มีในระบบ คุณจะได้รับลิงก์สำหรับรีเซ็ตรหัสผ่าน',
    });
  } catch (error) {
    authLogger.error('Password reset request error', { data: { error: String(error) } });
    console.error('Reset password request error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการส่งคำขอ' },
      { status: 500 }
    );
  }
}

// PATCH /api/auth/reset-password - Reset password with token
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json<ApiResponse>(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Hash the provided token
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      authLogger.warn('Invalid or expired reset token used');
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ' },
        { status: 400 }
      );
    }

    // Hash new password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    authLogger.info('Password reset successful', { 
      userId: user.id, 
      data: { email: user.email }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'รีเซ็ตรหัสผ่านสำเร็จ คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว',
    });
  } catch (error) {
    authLogger.error('Password reset error', { data: { error: String(error) } });
    console.error('Reset password error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' },
      { status: 500 }
    );
  }
}
