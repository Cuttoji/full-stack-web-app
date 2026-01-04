import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { authenticate, requireRole, requireAdmin, withAuth, withRole } from '@/lib/middleware/auth';
import { Role } from '@/lib/types';
import * as auth from '@/lib/auth';

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  getTokenFromHeader: vi.fn(),
  verifyToken: vi.fn(),
  hasPermission: vi.fn(),
  hasRoleLevel: vi.fn(),
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  authLogger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

function createMockRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set('authorization', authHeader);
  }
  return new NextRequest('http://localhost:3000/api/test', { headers });
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return error when no token provided', () => {
      vi.mocked(auth.getTokenFromHeader).mockReturnValue(null);
      
      const request = createMockRequest();
      const result = authenticate(request);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });

    it('should return error when token is invalid', () => {
      vi.mocked(auth.getTokenFromHeader).mockReturnValue('invalid-token');
      vi.mocked(auth.verifyToken).mockReturnValue(null);
      
      const request = createMockRequest('Bearer invalid-token');
      const result = authenticate(request);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });

    it('should return user when token is valid', () => {
      const mockUser = {
        id: '1',
        employeeId: 'EMP001',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.ADMIN,
        departmentId: 'dept1',
      };
      
      vi.mocked(auth.getTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyToken).mockReturnValue(mockUser);
      
      const request = createMockRequest('Bearer valid-token');
      const result = authenticate(request);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user).toEqual(mockUser);
      }
    });
  });

  describe('requireRole', () => {
    const adminUser = {
      id: '1',
      employeeId: 'EMP001',
      email: 'admin@example.com',
      name: 'Admin',
      role: Role.ADMIN,
      departmentId: 'dept1',
    };

    const techUser = {
      id: '2',
      employeeId: 'EMP002',
      email: 'tech@example.com',
      name: 'Tech',
      role: Role.TECH,
      departmentId: 'dept1',
    };

    it('should return null when user has required role', () => {
      const result = requireRole(adminUser, Role.ADMIN);
      expect(result).toBeNull();
    });

    it('should return null when user has one of required roles', () => {
      const result = requireRole(adminUser, [Role.ADMIN, Role.LEADER]);
      expect(result).toBeNull();
    });

    it('should return error when user does not have required role', () => {
      const result = requireRole(techUser, Role.ADMIN);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });
  });

  describe('requireAdmin', () => {
    it('should return null for admin user', () => {
      const adminUser = {
        id: '1',
        employeeId: 'EMP001',
        email: 'admin@example.com',
        name: 'Admin',
        role: Role.ADMIN,
        departmentId: 'dept1',
      };
      
      const result = requireAdmin(adminUser);
      expect(result).toBeNull();
    });

    it('should return error for non-admin user', () => {
      const techUser = {
        id: '2',
        employeeId: 'EMP002',
        email: 'tech@example.com',
        name: 'Tech',
        role: Role.TECH,
        departmentId: 'dept1',
      };
      
      const result = requireAdmin(techUser);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });
  });

  describe('withAuth HOC', () => {
    it('should call handler with user when authenticated', async () => {
      const mockUser = {
        id: '1',
        employeeId: 'EMP001',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.ADMIN,
        departmentId: 'dept1',
      };
      
      vi.mocked(auth.getTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyToken).mockReturnValue(mockUser);
      
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      
      const wrappedHandler = withAuth(handler);
      const request = createMockRequest('Bearer valid-token');
      
      await wrappedHandler(request);
      
      expect(handler).toHaveBeenCalledWith(request, mockUser);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.getTokenFromHeader).mockReturnValue(null);
      
      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      const request = createMockRequest();
      
      const response = await wrappedHandler(request);
      
      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });

  describe('withRole HOC', () => {
    it('should call handler when user has required role', async () => {
      const mockUser = {
        id: '1',
        employeeId: 'EMP001',
        email: 'admin@example.com',
        name: 'Admin',
        role: Role.ADMIN,
        departmentId: 'dept1',
      };
      
      vi.mocked(auth.getTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyToken).mockReturnValue(mockUser);
      
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      
      const wrappedHandler = withRole(Role.ADMIN, handler);
      const request = createMockRequest('Bearer valid-token');
      
      await wrappedHandler(request);
      
      expect(handler).toHaveBeenCalledWith(request, mockUser);
    });

    it('should return 403 when user does not have required role', async () => {
      const mockUser = {
        id: '2',
        employeeId: 'EMP002',
        email: 'tech@example.com',
        name: 'Tech',
        role: Role.TECH,
        departmentId: 'dept1',
      };
      
      vi.mocked(auth.getTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyToken).mockReturnValue(mockUser);
      
      const handler = vi.fn();
      const wrappedHandler = withRole(Role.ADMIN, handler);
      const request = createMockRequest('Bearer valid-token');
      
      const response = await wrappedHandler(request);
      
      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });
});
