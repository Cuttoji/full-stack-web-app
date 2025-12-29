import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hashPassword, hasPermission, canAccessWithScope } from '@/lib/auth';
import { ApiResponse, CreateUserRequest, User, Role, PaginatedResponse, DefaultRoleScope, RoleHierarchy } from '@/lib/types';
import { USE_MOCK_DB } from '@/lib/mockDb';
import { mockUsers } from '@/lib/mockData';

// GET /api/users - Get all users (with pagination and filters)
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const roleParam = searchParams.get('role');
    const roles = roleParam ? roleParam.split(',').filter(r => r) as Role[] : null;
    const departmentId = searchParams.get('departmentId');
    const subUnitId = searchParams.get('subUnitId');
    const isActive = searchParams.get('isActive');

    if (USE_MOCK_DB) {
      let filteredUsers = [...mockUsers];

      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = filteredUsers.filter(u =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.employeeId.toLowerCase().includes(searchLower)
        );
      }
      if (roles && roles.length > 0) {
        filteredUsers = filteredUsers.filter(u => roles.includes(u.role));
      }
      if (departmentId) {
        filteredUsers = filteredUsers.filter(u => u.departmentId === departmentId);
      }
      if (subUnitId) {
        filteredUsers = filteredUsers.filter(u => u.subUnitId === subUnitId);
      }
      if (isActive !== null && isActive !== undefined) {
        filteredUsers = filteredUsers.filter(u => u.isActive === (isActive === 'true'));
      }

      // Permission Scope-based filtering
      const userScope = DefaultRoleScope[currentUser.role as Role];
      if (userScope.type !== 'ALL') {
        filteredUsers = filteredUsers.filter(u => 
          canAccessWithScope(
            currentUser.role as Role,
            userScope,
            u.departmentId,
            u.subUnitId,
            u.id,
            currentUser.id
          )
        );
      }

      const total = filteredUsers.length;
      // Remove password from response
      const usersWithoutPassword = filteredUsers
        .slice((page - 1) * limit, page * limit)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ password: _pwd, ...user }) => user);

      return NextResponse.json<ApiResponse<PaginatedResponse<User>>>({
        success: true,
        data: {
          data: usersWithoutPassword as User[],
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (Admin/Leaders only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || !hasPermission(currentUser.role as Role, 'canManageUsers')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการสร้างผู้ใช้' },
        { status: 403 }
      );
    }

    const body = await request.json() as CreateUserRequest & { supervisorId?: string; permissionScope?: unknown };
    const { employeeId, email, password, name, phone, role, departmentId, subUnitId, leaveQuota, supervisorId, permissionScope } = body;

    // Validation
    if (!employeeId || !email || !password || !name || !role) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

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
    if (supervisorId && USE_MOCK_DB) {
      const supervisor = mockUsers.find(u => u.id === supervisorId);
      if (supervisor && RoleHierarchy[supervisor.role] <= RoleHierarchy[role]) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'ผู้บังคับบัญชาต้องมีลำดับชั้นสูงกว่าพนักงาน' },
          { status: 400 }
        );
      }
    }

    if (USE_MOCK_DB) {
      // Check if already exists
      const existingUser = mockUsers.find(u => u.employeeId === employeeId || u.email === email);
      if (existingUser) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'รหัสพนักงานหรืออีเมลนี้มีในระบบแล้ว' },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(password);
      const newUser = {
        id: `user-${Date.now()}`,
        employeeId,
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        avatar: null,
        role,
        departmentId: departmentId || null,
        department: null,
        subUnitId: subUnitId || null,
        subUnit: null,
        supervisorId: supervisorId || null,
        permissionScope: permissionScope || DefaultRoleScope[role],
        leaveQuota: leaveQuota || 15,
        leaveUsed: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = newUser;

      return NextResponse.json<ApiResponse<User>>({
        success: true,
        data: userWithoutPassword as unknown as User,
        message: 'สร้างผู้ใช้สำเร็จ (Mock)',
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' },
      { status: 500 }
    );
  }
}
