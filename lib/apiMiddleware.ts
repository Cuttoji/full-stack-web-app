import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, Role, PermissionKey } from '@/lib/types';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    employeeId: string;
    email: string;
    name: string;
    role: Role;
    departmentId?: string;
    subUnitId?: string;
  };
}

/**
 * Middleware to authenticate API requests
 */
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options?: {
    requiredPermission?: PermissionKey;
    allowedRoles?: Role[];
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Token ไม่ถูกต้องหรือหมดอายุ' },
        { status: 401 }
      );
    }

    // Check required permission
    if (options?.requiredPermission) {
      if (!hasPermission(user.role as Role, options.requiredPermission)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'คุณไม่มีสิทธิ์ดำเนินการนี้' },
          { status: 403 }
        );
      }
    }

    // Check allowed roles
    if (options?.allowedRoles && options.allowedRoles.length > 0) {
      if (!options.allowedRoles.includes(user.role as Role)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้' },
          { status: 403 }
        );
      }
    }

    // Add user to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = user as AuthenticatedRequest['user'];

    return handler(authenticatedRequest);
  };
}

/**
 * Helper to extract user from authenticated request
 */
export function getAuthUser(request: AuthenticatedRequest) {
  return request.user;
}

/**
 * Create a protected API handler with authentication
 */
export function createProtectedHandler<T = unknown>(
  handler: (
    request: AuthenticatedRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => Promise<NextResponse<ApiResponse<T>>>,
  options?: {
    requiredPermission?: PermissionKey;
    allowedRoles?: Role[];
  }
) {
  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Token ไม่ถูกต้องหรือหมดอายุ' },
        { status: 401 }
      );
    }

    // Check required permission
    if (options?.requiredPermission) {
      if (!hasPermission(user.role as Role, options.requiredPermission)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'คุณไม่มีสิทธิ์ดำเนินการนี้' },
          { status: 403 }
        );
      }
    }

    // Check allowed roles
    if (options?.allowedRoles && options.allowedRoles.length > 0) {
      if (!options.allowedRoles.includes(user.role as Role)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้' },
          { status: 403 }
        );
      }
    }

    // Add user to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = user as AuthenticatedRequest['user'];

    return handler(authenticatedRequest, context);
  };
}
