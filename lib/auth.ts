import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthUser, Role } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
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

// Role-based access control helpers
export const RolePermissions = {
  [Role.ADMIN]: {
    canManageUsers: true,
    canManageDepartments: true,
    canManageSettings: true,
    canCreateTasks: true,
    canAssignTasks: true,
    canViewAllTasks: true,
    canManageCars: true,
    canApproveLeaves: true,
    canViewReports: true,
  },
  [Role.FINANCE]: {
    canManageUsers: false,
    canManageDepartments: false,
    canManageSettings: false,
    canCreateTasks: true,
    canAssignTasks: false,
    canViewAllTasks: true,
    canManageCars: false,
    canApproveLeaves: false,
    canViewReports: true,
  },
  [Role.SALES]: {
    canManageUsers: false,
    canManageDepartments: false,
    canManageSettings: false,
    canCreateTasks: false, // Can create briefs
    canAssignTasks: false,
    canViewAllTasks: false, // Only view own customer tasks
    canManageCars: false,
    canApproveLeaves: false,
    canViewReports: false,
  },
  [Role.HEAD_TECH]: {
    canManageUsers: false,
    canManageDepartments: false,
    canManageSettings: false,
    canCreateTasks: false,
    canAssignTasks: true,
    canViewAllTasks: true,
    canManageCars: true,
    canApproveLeaves: false,
    canViewReports: true,
  },
  [Role.LEADER]: {
    canManageUsers: false,
    canManageDepartments: false,
    canManageSettings: false,
    canCreateTasks: false,
    canAssignTasks: false,
    canViewAllTasks: false, // Only view sub-unit tasks
    canManageCars: false,
    canApproveLeaves: true, // Only for sub-unit members
    canViewReports: true, // Only sub-unit reports
  },
  [Role.TECH]: {
    canManageUsers: false,
    canManageDepartments: false,
    canManageSettings: false,
    canCreateTasks: false,
    canAssignTasks: false,
    canViewAllTasks: false, // Only view assigned tasks
    canManageCars: false,
    canApproveLeaves: false,
    canViewReports: false,
  },
};

export function hasPermission(role: Role, permission: keyof typeof RolePermissions[Role.ADMIN]): boolean {
  return RolePermissions[role]?.[permission] ?? false;
}

export function canAccessRoute(role: Role, route: string): boolean {
  const routePermissions: Record<string, Role[]> = {
    '/admin': [Role.ADMIN],
    '/dashboard/admin': [Role.ADMIN],
    '/dashboard/finance': [Role.ADMIN, Role.FINANCE],
    '/dashboard/sales': [Role.ADMIN, Role.SALES],
    '/dashboard/head-tech': [Role.ADMIN, Role.HEAD_TECH],
    '/dashboard/leader': [Role.ADMIN, Role.LEADER],
    '/dashboard/tech': [Role.ADMIN, Role.TECH],
    '/tasks': [Role.ADMIN, Role.FINANCE, Role.HEAD_TECH, Role.LEADER, Role.TECH],
    '/leaves': [Role.ADMIN, Role.LEADER, Role.TECH],
    '/cars': [Role.ADMIN, Role.HEAD_TECH],
    '/users': [Role.ADMIN],
    '/reports': [Role.ADMIN, Role.FINANCE, Role.HEAD_TECH, Role.LEADER],
  };

  const allowedRoles = routePermissions[route];
  if (!allowedRoles) return true; // If not specified, allow access
  return allowedRoles.includes(role);
}
