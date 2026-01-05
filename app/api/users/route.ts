import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, hasPermission } from '@/lib/auth';
import { withAuth } from '@/lib/middleware';
import { ApiResponse, User, Role, PaginatedResponse, DefaultRoleScope, RoleHierarchy } from '@/lib/types';
import { createUserSchema, getUsersQuerySchema, validateRequest, validateQueryParams } from '@/lib/validations';
import prisma from '@/lib/prisma';

// GET /api/users - Get all users (with pagination and filters)
export const GET = withAuth(async (request, currentUser) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryValidation = validateQueryParams(getUsersQuerySchema, searchParams);
    if (!queryValidation.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: queryValidation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    const { page, limit, search, role: roleParam, departmentId, subUnitId, isActive } = queryValidation.data;
    const roles = roleParam ? roleParam.split(',').filter(r => r) as Role[] : null;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (roles && roles.length > 0) {
      where.role = { in: roles };
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }
    if (subUnitId) {
      where.subUnitId = subUnitId;
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Permission Scope-based filtering
    const userScope = DefaultRoleScope[currentUser.role as Role];
    if (userScope.type === 'DEPARTMENT' && currentUser.departmentId) {
      where.departmentId = currentUser.departmentId;
    } else if (userScope.type === 'SUBUNIT' && currentUser.subUnitId) {
      where.subUnitId = currentUser.subUnitId;
    } else if (userScope.type === 'SELF') {
      where.id = currentUser.id;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
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
          permissions: true,
          createdAt: true,
          updatedAt: true,
          department: true,
          subUnit: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json<ApiResponse<PaginatedResponse<User>>>({
      success: true,
      data: {
        data: users as User[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' },
      { status: 500 }
    );
  }
});

// POST /api/users - Create new user (Admin/Leaders only)
export const POST = withAuth(async (request, currentUser) => {
  try {
    if (!hasPermission(currentUser.role as Role, 'canManageUsers')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการสร้างผู้ใช้' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(createUserSchema, body);
    if (!validation.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    const { employeeId, email, password, name, phone, role, departmentId, subUnitId, leaveQuota, supervisorId, permissionScope } = validation.data;

    // Validate hierarchy - ผู้สร้างต้องมีลำดับชั้นสูงกว่าผู้ใช้ที่สร้าง
    if (RoleHierarchy[currentUser.role as Role] <= RoleHierarchy[role]) {
      if (currentUser.role !== Role.ADMIN) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'คุณไม่มีสิทธิ์สร้างผู้ใช้ที่มีระดับเท่ากับหรือสูงกว่าคุณ' },
          { status: 403 }
        );
      }
    }

    // Validate supervisorId - supervisor ต้องมีลำดับชั้นสูงกว่า
    if (supervisorId) {
      const supervisor = await prisma.user.findUnique({ where: { id: supervisorId } });
      if (supervisor && RoleHierarchy[supervisor.role as Role] <= RoleHierarchy[role]) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'ผู้บังคับบัญชาต้องมีลำดับชั้นสูงกว่าพนักงาน' },
          { status: 400 }
        );
      }
    }

    // Check if already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ employeeId }, { email }],
      },
    });
    if (existingUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'รหัสพนักงานหรืออีเมลนี้มีในระบบแล้ว' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        employeeId,
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: role as Role,
        departmentId: departmentId || null,
        subUnitId: subUnitId || null,
        supervisorId: supervisorId || null,
        permissionScope: permissionScope || DefaultRoleScope[role],
        leaveQuota: leaveQuota || 15,
        leaveUsed: 0,
        isActive: true,
      },
      include: {
        department: true,
        subUnit: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json<ApiResponse<User>>({
      success: true,
      data: userWithoutPassword as unknown as User,
      message: 'สร้างผู้ใช้สำเร็จ',
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' },
      { status: 500 }
    );
  }
});
