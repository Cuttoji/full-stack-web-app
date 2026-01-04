import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getTokenFromHeader,
  hasPermission,
  canAccessWithScope,
  canApproveLeaveFor,
  getNextApprover,
  isHigherInHierarchy,
  canAccessRoute,
} from '@/lib/auth';
import { Role, AuthUser, UserPermissions, PermissionScope } from '@/lib/types';

// Mock the env module
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    JWT_SECRET: 'test-secret-key-for-testing-purposes',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    NODE_ENV: 'test',
  }),
}));

describe('Auth Utilities', () => {
  describe('hashPassword', () => {
    it('should return a hashed password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(password.length);
    });

    it('should create different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const result = await verifyPassword('wrongPassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const user: AuthUser = {
        id: 'user-1',
        employeeId: 'EMP001',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.TECH,
        departmentId: 'dept-1',
        subUnitId: 'sub-1',
      };

      const token = generateToken(user);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should return user data for valid token', () => {
      const user: AuthUser = {
        id: 'user-1',
        employeeId: 'EMP001',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.TECH,
        departmentId: 'dept-1',
        subUnitId: 'sub-1',
      };

      const token = generateToken(user);
      const result = verifyToken(token);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.email).toBe(user.email);
      expect(result?.role).toBe(user.role);
    });

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for tampered token', () => {
      const user: AuthUser = {
        id: 'user-1',
        employeeId: 'EMP001',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.TECH,
        departmentId: 'dept-1',
        subUnitId: 'sub-1',
      };

      const token = generateToken(user);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      const result = verifyToken(tamperedToken);
      
      expect(result).toBeNull();
    });
  });

  describe('getTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'my-jwt-token';
      const header = `Bearer ${token}`;
      
      expect(getTokenFromHeader(header)).toBe(token);
    });

    it('should return null for null header', () => {
      expect(getTokenFromHeader(null)).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      expect(getTokenFromHeader('my-jwt-token')).toBeNull();
    });

    it('should return null for empty header', () => {
      expect(getTokenFromHeader('')).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should return true for ADMIN with management permissions', () => {
      expect(hasPermission(Role.ADMIN, 'canManageUsers')).toBe(true);
      expect(hasPermission(Role.ADMIN, 'canApproveLeave')).toBe(true);
      expect(hasPermission(Role.ADMIN, 'canManageFleet')).toBe(true);
    });

    it('should return false for TECH with admin permissions', () => {
      expect(hasPermission(Role.TECH, 'canManageUsers')).toBe(false);
    });

    it('should use custom permissions when provided', () => {
      const customPermissions: UserPermissions = {
        canManageUsers: true,
        canApproveLeave: false,
        canManageTasks: true,
        canViewReports: false,
        canManageFleet: false,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTaskDetails: true,
        canDeleteTasks: false,
        canAssignTasks: false,
        canViewAllCalendars: false,
        canViewTeamCalendar: false,
        canBookVehicles: false,
        canViewLeaveRequests: false,
        canViewAllUsers: false,
        canManageDailyTechnician: false,
        canExportData: false,
      };
      
      expect(hasPermission(Role.TECH, 'canManageUsers', customPermissions)).toBe(true);
    });
  });

  describe('canAccessWithScope', () => {
    it('should return true for ALL scope', () => {
      const scope: PermissionScope = { type: 'ALL' };
      expect(canAccessWithScope(Role.ADMIN, scope)).toBe(true);
    });

    it('should check department scope correctly', () => {
      const scope: PermissionScope = { 
        type: 'DEPARTMENT', 
        departmentIds: ['dept-1', 'dept-2'] 
      };
      
      expect(canAccessWithScope(Role.LEADER, scope, 'dept-1')).toBe(true);
      expect(canAccessWithScope(Role.LEADER, scope, 'dept-3')).toBe(false);
    });

    it('should return true for SELF scope when user matches', () => {
      const scope: PermissionScope = { type: 'SELF' };
      expect(canAccessWithScope(Role.TECH, scope, undefined, undefined, 'user-1', 'user-1')).toBe(true);
      expect(canAccessWithScope(Role.TECH, scope, undefined, undefined, 'user-2', 'user-1')).toBe(false);
    });
  });

  describe('canApproveLeaveFor', () => {
    it('should return true if approver is direct supervisor', () => {
      expect(canApproveLeaveFor(Role.LEADER, 'leader-1', Role.TECH, 'leader-1')).toBe(true);
    });

    it('should return true for ADMIN approving anyone', () => {
      expect(canApproveLeaveFor(Role.ADMIN, 'admin-1', Role.TECH)).toBe(true);
      expect(canApproveLeaveFor(Role.ADMIN, 'admin-1', Role.LEADER)).toBe(true);
    });

    it('should return false for unauthorized approver', () => {
      expect(canApproveLeaveFor(Role.TECH, 'tech-1', Role.TECH)).toBe(false);
    });
  });

  describe('getNextApprover', () => {
    it('should return approvers for TECH role', () => {
      const approvers = getNextApprover(Role.TECH);
      expect(Array.isArray(approvers)).toBe(true);
    });

    it('should return empty array for unknown role', () => {
      const approvers = getNextApprover('UNKNOWN' as Role);
      expect(approvers).toEqual([]);
    });
  });

  describe('isHigherInHierarchy', () => {
    it('should return true when first role is higher', () => {
      expect(isHigherInHierarchy(Role.ADMIN, Role.TECH)).toBe(true);
      expect(isHigherInHierarchy(Role.HEAD_TECH, Role.TECH)).toBe(true);
    });

    it('should return false when first role is lower', () => {
      expect(isHigherInHierarchy(Role.TECH, Role.ADMIN)).toBe(false);
    });

    it('should return false for equal hierarchy', () => {
      expect(isHigherInHierarchy(Role.TECH, Role.TECH)).toBe(false);
    });
  });

  describe('canAccessRoute', () => {
    it('should return true for ADMIN accessing any route', () => {
      expect(canAccessRoute(Role.ADMIN, '/admin')).toBe(true);
      expect(canAccessRoute(Role.ADMIN, '/users')).toBe(true);
    });

    it('should return false for TECH accessing admin routes', () => {
      expect(canAccessRoute(Role.TECH, '/admin')).toBe(false);
    });

    it('should return true for TECH accessing tasks', () => {
      expect(canAccessRoute(Role.TECH, '/tasks')).toBe(true);
    });

    it('should return true for unspecified routes', () => {
      expect(canAccessRoute(Role.TECH, '/some-unknown-route')).toBe(true);
    });
  });
});
