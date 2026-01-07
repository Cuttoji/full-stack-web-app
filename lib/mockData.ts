// Mock data for development/testing
// Used by mockDb.ts for in-memory database simulation

import { Role } from './types';

// Mock Users
export const mockUsers = [
  {
    id: 'user-1',
    employeeId: 'EMP001',
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'hashed_password',
    phone: '0812345678',
    avatar: null,
    role: Role.ADMIN,
    departmentId: 'dept-1',
    subUnitId: 'subunit-1',
    leaveQuota: 30,
    leaveUsed: 0,
    isActive: true,
    permissions: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock Departments  
export const mockDepartments = [
  {
    id: 'dept-1',
    name: 'ฝ่ายเทคนิค',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock SubUnits
export const mockSubUnits = [
  {
    id: 'subunit-1',
    name: 'ทีม A',
    departmentId: 'dept-1',
    type: 'TEAM',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock Tasks - Empty for production
export const mockTasks: Array<Record<string, unknown>> = [];

// Mock Leaves - Empty for production
export const mockLeaves: Array<Record<string, unknown>> = [];

// Mock Cars - Empty for production
export const mockCars: Array<Record<string, unknown>> = [];

// Mock Notifications - Empty for production
export const mockNotifications: Array<Record<string, unknown>> = [];

// Mock Dashboard Stats - Reset for production
export const mockDashboardStats = {
  totalTasks: 0,
  waitingTasks: 0,
  inProgressTasks: 0,
  completedTasks: 0,
  cancelledTasks: 0,
  todayTasks: 0,
  pendingLeaves: 0,
  availableCars: 0,
};
