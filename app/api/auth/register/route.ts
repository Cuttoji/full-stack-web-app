import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { ApiResponse } from '@/lib/types';
import prisma from '@/lib/prisma';
import { authLogger } from '@/lib/logger';
import { Role } from '@prisma/client';

// Registration request schema
const registerSchema = z.object({
  name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร').max(100),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  employeeId: z.string().optional(),
});

// POST /api/auth/register - Register new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json<ApiResponse>(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { name, email, password, phone, departmentId, employeeId } = validation.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      authLogger.warn('Registration failed: Email already exists', { data: { email } });
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'อีเมลนี้มีผู้ใช้งานแล้ว' },
        { status: 400 }
      );
    }

    // Generate employeeId if not provided
    const finalEmployeeId = employeeId || `EMP${Date.now().toString(36).toUpperCase()}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Resolve departmentId: accept either a real id or a department name (fallback)
    let departmentIdToUse: string | null = null;
    if (departmentId && departmentId.trim() !== '') {
      // Try find by id first
      const deptById = await prisma.department.findUnique({ where: { id: departmentId } });
      if (deptById) {
        departmentIdToUse = deptById.id;
      } else {
        // If not found by id, try matching by name (case-insensitive)
        let deptByName = await prisma.department.findFirst({ where: { name: { equals: departmentId, mode: 'insensitive' } } });
        if (!deptByName) {
          // Support common English slugs mapping to Thai department names
          const slugMap: Record<string, string> = {
            tech: 'แผนกช่าง',
            sales: 'ฝ่ายขาย',
            finance: 'ฝ่ายการเงิน',
            cs: 'ฝ่ายบริการลูกค้า',
            customer_service: 'ฝ่ายบริการลูกค้า',
          };
          const mappedName = slugMap[departmentId.toLowerCase()];
          if (mappedName) {
            deptByName = await prisma.department.findFirst({ where: { name: { equals: mappedName, mode: 'insensitive' } } });
            if (deptByName) {
              authLogger.info('Mapped department slug to Thai name during registration', { data: { provided: departmentId, mappedName } });
            }
          }
        }

        if (deptByName) {
          departmentIdToUse = deptByName.id;
          authLogger.info('Mapped department name to id during registration', { data: { provided: departmentId, mapped: departmentIdToUse } });
        } else {
          authLogger.warn('Registration failed: invalid departmentId', { data: { departmentId } });
          return NextResponse.json<ApiResponse>(
            { success: false, error: 'แผนกไม่ถูกต้อง' },
            { status: 400 }
          );
        }
      }
    }

    // Create user with default TECH role (lowest privilege)
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || null,
        role: Role.TECH, // Default role - can be changed by admin
        departmentId: departmentIdToUse,
        employeeId: finalEmployeeId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    });

    authLogger.info('User registered successfully', { 
      userId: newUser.id, 
      data: { email: newUser.email }
    });

    return NextResponse.json<ApiResponse<typeof newUser>>({
      success: true,
      data: newUser,
      message: 'ลงทะเบียนสำเร็จ',
    });
  } catch (error) {
    authLogger.error('Registration error', { data: { error: String(error) } });
    console.error('Register error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการลงทะเบียน' },
      { status: 500 }
    );
  }
}
