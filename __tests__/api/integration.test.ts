import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Prisma client - with all necessary methods
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  task: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  leave: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  department: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
  taskAssignment: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

// Mock auth functions
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth');
  return {
    ...actual,
    verifyToken: vi.fn(),
    getTokenFromHeader: vi.fn(),
  };
});

// Mock env
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    JWT_SECRET: 'test-secret-key-for-testing',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    NODE_ENV: 'test',
  }),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  dbLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  authLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { Role } from '@/lib/types';

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    it('Dashboard API should require authentication', async () => {
      vi.mocked(getTokenFromHeader).mockReturnValue(null);
      vi.mocked(verifyToken).mockReturnValue(null);

      const { GET } = await import('@/app/api/dashboard/route');
      
      const req = new NextRequest('http://localhost:3000/api/dashboard', {
        headers: new Headers({})
      });
      
      const response = await GET(req);
      expect(response.status).toBe(401);
    });

    it('Users API should require authentication', async () => {
      vi.mocked(getTokenFromHeader).mockReturnValue(null);
      vi.mocked(verifyToken).mockReturnValue(null);

      const { GET } = await import('@/app/api/users/route');
      
      const req = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(req);
      
      expect(response.status).toBe(401);
    });

    it('Tasks API should require authentication', async () => {
      vi.mocked(getTokenFromHeader).mockReturnValue(null);
      vi.mocked(verifyToken).mockReturnValue(null);

      const { GET } = await import('@/app/api/tasks/route');
      
      const req = new NextRequest('http://localhost:3000/api/tasks');
      const response = await GET(req);
      
      expect(response.status).toBe(401);
    });

    it('Leaves API should require authentication', async () => {
      vi.mocked(getTokenFromHeader).mockReturnValue(null);
      vi.mocked(verifyToken).mockReturnValue(null);

      const { GET } = await import('@/app/api/leaves/route');
      
      const req = new NextRequest('http://localhost:3000/api/leaves');
      const response = await GET(req);
      
      expect(response.status).toBe(401);
    });

    it('Departments API should require authentication', async () => {
      vi.mocked(getTokenFromHeader).mockReturnValue(null);
      vi.mocked(verifyToken).mockReturnValue(null);

      const { GET } = await import('@/app/api/departments/route');
      
      const req = new NextRequest('http://localhost:3000/api/departments');
      const response = await GET(req);
      
      expect(response.status).toBe(401);
    });

    it('Notifications API should require authentication', async () => {
      vi.mocked(getTokenFromHeader).mockReturnValue(null);
      vi.mocked(verifyToken).mockReturnValue(null);

      const { GET } = await import('@/app/api/notifications/route');
      
      const req = new NextRequest('http://localhost:3000/api/notifications');
      const response = await GET(req);
      
      expect(response.status).toBe(401);
    });
  });

  describe('Tasks API', () => {
    it('should return tasks for authenticated user', async () => {
      const mockUser = {
        id: 'user-1',
        employeeId: 'EMP001',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.TECH,
        departmentId: 'dept-1',
        subUnitId: 'sub-1',
      };

      vi.mocked(getTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockReturnValue(mockUser);

      mockPrisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          jobNumber: 'JOB-001',
          title: 'Test Task',
          status: 'PENDING',
          priority: 'MEDIUM',
          assignedTo: [{ user: mockUser }],
          createdBy: mockUser,
        }
      ]);

      const { GET } = await import('@/app/api/tasks/route');
      
      const req = new NextRequest('http://localhost:3000/api/tasks', {
        headers: new Headers({
          'Authorization': 'Bearer valid-token'
        })
      });
      
      const response = await GET(req);
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('Leaves API', () => {
    it('should return leaves for authenticated user', async () => {
      const mockUser = {
        id: 'user-1',
        employeeId: 'EMP001',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.TECH,
        departmentId: 'dept-1',
        subUnitId: 'sub-1',
      };

      vi.mocked(getTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockReturnValue(mockUser);

      mockPrisma.leave.findMany.mockResolvedValue([
        {
          id: 'leave-1',
          type: 'ANNUAL',
          startDate: new Date('2025-01-10'),
          endDate: new Date('2025-01-12'),
          status: 'PENDING',
          reason: 'Vacation',
          user: mockUser,
        }
      ]);

      const { GET } = await import('@/app/api/leaves/route');
      
      const req = new NextRequest('http://localhost:3000/api/leaves', {
        headers: new Headers({
          'Authorization': 'Bearer valid-token'
        })
      });
      
      const response = await GET(req);
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('Departments API', () => {
    it('should return departments for authenticated user', async () => {
      const mockUser = {
        id: 'user-1',
        employeeId: 'EMP001',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.ADMIN,
        departmentId: 'dept-1',
        subUnitId: undefined,
      };

      vi.mocked(getTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockReturnValue(mockUser);

      mockPrisma.department.findMany.mockResolvedValue([
        { id: 'dept-1', name: 'IT', code: 'IT' },
        { id: 'dept-2', name: 'HR', code: 'HR' },
      ]);

      const { GET } = await import('@/app/api/departments/route');
      
      const req = new NextRequest('http://localhost:3000/api/departments', {
        headers: new Headers({
          'Authorization': 'Bearer valid-token'
        })
      });
      
      const response = await GET(req);
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('Notifications API', () => {
    it('should return notifications for authenticated user', async () => {
      const mockUser = {
        id: 'user-1',
        employeeId: 'EMP001',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.TECH,
        departmentId: 'dept-1',
        subUnitId: 'sub-1',
      };

      vi.mocked(getTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockReturnValue(mockUser);

      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'TASK_ASSIGNED',
          title: 'New task assigned',
          message: 'You have been assigned a new task',
          isRead: false,
          createdAt: new Date(),
        }
      ]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const { GET } = await import('@/app/api/notifications/route');
      
      const req = new NextRequest('http://localhost:3000/api/notifications', {
        headers: new Headers({
          'Authorization': 'Bearer valid-token'
        })
      });
      
      const response = await GET(req);
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });
});
