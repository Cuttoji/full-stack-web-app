import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hasPermission, isHigherInHierarchy } from '@/lib/auth';
import { AuthUser, Role, PermissionScope, ApiResponse, RoleHierarchy } from '@/lib/types';
import { authLogger } from '@/lib/logger';

/**
 * Authentication result type
 */
export interface AuthResult {
  success: true;
  user: AuthUser;
}

export interface AuthError {
  success: false;
  response: NextResponse<ApiResponse>;
}

export type AuthCheck = AuthResult | AuthError;

/**
 * Authenticate a request and return the user
 * Returns either the authenticated user or an error response
 */
export function authenticate(request: NextRequest): AuthCheck {
  const authHeader = request.headers.get('authorization');
  const token = getTokenFromHeader(authHeader);

  if (!token) {
    authLogger.warn('Authentication failed: No token provided', {
      path: request.nextUrl.pathname,
    });
    return {
      success: false,
      response: NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      ),
    };
  }

  const user = verifyToken(token);
  if (!user) {
    authLogger.warn('Authentication failed: Invalid token', {
      path: request.nextUrl.pathname,
    });
    return {
      success: false,
      response: NextResponse.json<ApiResponse>(
        { success: false, error: 'Token ไม่ถูกต้องหรือหมดอายุ' },
        { status: 401 }
      ),
    };
  }

  return { success: true, user };
}

/**
 * Check if user has required role(s)
 */
export function requireRole(
  user: AuthUser,
  roles: Role | Role[]
): NextResponse<ApiResponse> | null {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  if (!allowedRoles.includes(user.role)) {
    authLogger.warn('Authorization failed: Insufficient role', {
      userId: user.id,
      userRole: user.role,
      requiredRoles: allowedRoles,
    });
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Check if user has required permission
 */
export function requirePermission(
  user: AuthUser,
  permission: keyof typeof import('@/lib/types').DefaultRolePermissions[Role],
  scope?: PermissionScope
): NextResponse<ApiResponse> | null {
  if (!hasPermission(user, permission, scope)) {
    authLogger.warn('Authorization failed: Insufficient permission', {
      userId: user.id,
      permission,
      scope,
    });
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'ไม่มีสิทธิ์ดำเนินการนี้' },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Check if user has minimum role level (using role hierarchy)
 */
function hasRoleLevel(user: AuthUser, minRole: Role): boolean {
  return RoleHierarchy[user.role as Role] >= RoleHierarchy[minRole];
}

/**
 * Check if user has minimum role level
 */
export function requireRoleLevel(
  user: AuthUser,
  minRole: Role
): NextResponse<ApiResponse> | null {
  if (!hasRoleLevel(user, minRole)) {
    authLogger.warn('Authorization failed: Role level too low', {
      userId: user.id,
      userRole: user.role,
      requiredMinRole: minRole,
    });
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Higher-order function to wrap API handlers with authentication
 */
export function withAuth<T = unknown>(
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T | ApiResponse>> => {
    const authResult = authenticate(request);
    
    if (!authResult.success) {
      return authResult.response as NextResponse<T | ApiResponse>;
    }
    
    return handler(request, authResult.user);
  };
}

/**
 * Higher-order function to wrap API handlers with role check
 */
export function withRole<T = unknown>(
  roles: Role | Role[],
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T | ApiResponse>> => {
    const authResult = authenticate(request);
    
    if (!authResult.success) {
      return authResult.response as NextResponse<T | ApiResponse>;
    }
    
    const roleError = requireRole(authResult.user, roles);
    if (roleError) {
      return roleError as NextResponse<T | ApiResponse>;
    }
    
    return handler(request, authResult.user);
  };
}

/**
 * Higher-order function to wrap API handlers with permission check
 */
export function withPermission<T = unknown>(
  permission: keyof typeof import('@/lib/types').DefaultRolePermissions[Role],
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse<T>>,
  scope?: PermissionScope
) {
  return async (request: NextRequest): Promise<NextResponse<T | ApiResponse>> => {
    const authResult = authenticate(request);
    
    if (!authResult.success) {
      return authResult.response as NextResponse<T | ApiResponse>;
    }
    
    const permError = requirePermission(authResult.user, permission, scope);
    if (permError) {
      return permError as NextResponse<T | ApiResponse>;
    }
    
    return handler(request, authResult.user);
  };
}

// ==================== ADMIN-ONLY HELPERS ====================

/**
 * Require admin role
 */
export function requireAdmin(user: AuthUser): NextResponse<ApiResponse> | null {
  return requireRole(user, Role.ADMIN);
}

/**
 * Require admin or leader roles
 */
export function requireLeaderOrAbove(user: AuthUser): NextResponse<ApiResponse> | null {
  return requireRole(user, [
    Role.ADMIN,
    Role.HEAD_TECH,
    Role.LEADER,
    Role.FINANCE_LEADER,
    Role.SALES_LEADER,
  ]);
}

/**
 * Higher-order function for admin-only routes
 */
export function withAdmin<T = unknown>(
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse<T>>
) {
  return withRole(Role.ADMIN, handler);
}
