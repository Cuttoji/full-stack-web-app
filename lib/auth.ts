import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { 
  AuthUser, 
  Role, 
  UserPermissions, 
  PermissionScope, 
  DefaultRolePermissions, 
  DefaultRoleScope, 
  RoleHierarchy,
  LeaveApprovalChain 
} from './types';
import { getEnv } from './env';

const env = getEnv();
const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      employeeId: user.employeeId,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      subUnitId: user.subUnitId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// ==================== PERMISSION HELPERS ====================

// ตรวจสอบว่า user มี permission หรือไม่
export function hasPermission(
  role: Role, 
  permission: keyof UserPermissions,
  userPermissions?: UserPermissions
): boolean {
  // ถ้ามี custom permissions ให้ใช้ก่อน
  if (userPermissions && userPermissions[permission] !== undefined) {
    return userPermissions[permission] ?? false;
  }
  // ใช้ default permissions ตาม role
  return DefaultRolePermissions[role]?.[permission] ?? false;
}

// ตรวจสอบว่า user สามารถเข้าถึง resource ตาม scope หรือไม่
export function canAccessWithScope(
  userRole: Role,
  userScope: PermissionScope | undefined,
  resourceDepartmentId?: string,
  resourceSubUnitId?: string,
  resourceUserId?: string,
  currentUserId?: string
): boolean {
  const scope = userScope || DefaultRoleScope[userRole];
  
  switch (scope.type) {
    case 'ALL':
      return true;
    
    case 'DEPARTMENT':
      if (scope.departmentIds && scope.departmentIds.length > 0) {
        return resourceDepartmentId ? scope.departmentIds.includes(resourceDepartmentId) : false;
      }
      return true; // ถ้าไม่ได้กำหนด departmentIds = ทุก department ที่ตัวเองอยู่
    
    case 'SUBUNIT':
      if (scope.subUnitIds && scope.subUnitIds.length > 0) {
        return resourceSubUnitId ? scope.subUnitIds.includes(resourceSubUnitId) : false;
      }
      return true;
    
    case 'TEAM':
      if (scope.userIds && scope.userIds.length > 0) {
        return resourceUserId ? scope.userIds.includes(resourceUserId) : false;
      }
      return false;
    
    case 'SELF':
      return resourceUserId === currentUserId;
    
    default:
      return false;
  }
}

// ==================== HIERARCHICAL APPROVAL HELPERS ====================

// ตรวจสอบว่า approver สามารถอนุมัติใบลาของ user ได้หรือไม่
export function canApproveLeaveFor(
  approverRole: Role,
  approverId: string,
  targetUserRole: Role,
  targetUserSupervisorId?: string
): boolean {
  // 1. ตรวจสอบว่าเป็น supervisor โดยตรงหรือไม่
  if (targetUserSupervisorId === approverId) {
    return true;
  }
  
  // 2. ตรวจสอบจาก LeaveApprovalChain
  const allowedApprovers = LeaveApprovalChain[targetUserRole];
  if (allowedApprovers && allowedApprovers.includes(approverRole)) {
    return true;
  }
  
  // 3. ADMIN สามารถอนุมัติได้ทุกคน
  if (approverRole === Role.ADMIN) {
    return true;
  }
  
  return false;
}

// หาผู้อนุมัติถัดไปในลำดับชั้น
export function getNextApprover(userRole: Role): Role[] {
  return LeaveApprovalChain[userRole] || [];
}

// ตรวจสอบว่า role มีลำดับชั้นสูงกว่าหรือไม่
export function isHigherInHierarchy(role1: Role, role2: Role): boolean {
  return RoleHierarchy[role1] > RoleHierarchy[role2];
}

// ==================== ROUTE ACCESS CONTROL ====================

export function canAccessRoute(role: Role, route: string): boolean {
  const routePermissions: Record<string, Role[]> = {
    '/admin': [Role.ADMIN],
    '/dashboard/admin': [Role.ADMIN],
    '/dashboard/finance': [Role.ADMIN, Role.FINANCE_LEADER, Role.FINANCE],
    '/dashboard/sales': [Role.ADMIN, Role.SALES_LEADER, Role.SALES],
    '/dashboard/head-tech': [Role.ADMIN, Role.HEAD_TECH],
    '/dashboard/leader': [Role.ADMIN, Role.LEADER],
    '/dashboard/tech': [Role.ADMIN, Role.TECH],
    '/tasks': [Role.ADMIN, Role.CUSTOMER_SERVICE, Role.FINANCE_LEADER, Role.FINANCE, Role.SALES_LEADER, Role.SALES, Role.HEAD_TECH, Role.LEADER, Role.TECH],
    '/leaves': [Role.ADMIN, Role.CUSTOMER_SERVICE, Role.FINANCE_LEADER, Role.FINANCE, Role.SALES_LEADER, Role.SALES, Role.HEAD_TECH, Role.LEADER, Role.TECH],
    '/cars': [Role.ADMIN, Role.HEAD_TECH, Role.LEADER],
    '/users': [Role.ADMIN, Role.FINANCE_LEADER, Role.SALES_LEADER, Role.HEAD_TECH],
    '/reports': [Role.ADMIN, Role.CUSTOMER_SERVICE, Role.FINANCE_LEADER, Role.FINANCE, Role.SALES_LEADER, Role.HEAD_TECH, Role.LEADER],
  };

  const allowedRoles = routePermissions[route];
  if (!allowedRoles) return true; // If not specified, allow access
  return allowedRoles.includes(role);
}
