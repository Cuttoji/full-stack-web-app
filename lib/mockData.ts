// Mock data for development/testing
// Used by mockDb.ts for in-memory database simulation

import { Role, TaskStatus, LeaveStatus, CarStatus } from './types';

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

// Mock Tasks
export const mockTasks = [
  {
    id: 'task-1',
    jobNumber: 'JOB-001',
    title: 'งานตัวอย่าง',
    description: 'รายละเอียดงาน',
    location: 'กรุงเทพฯ',
    customerName: 'ลูกค้าตัวอย่าง',
    customerPhone: '0899999999',
    scheduledDate: new Date(),
    startDate: new Date(),
    endDate: new Date(),
    startTime: '09:00',
    endTime: '17:00',
    status: TaskStatus.WAITING,
    isLoop: false,
    loopPattern: null,
    loopInterval: null,
    loopEndDate: null,
    parentTaskId: null,
    subUnitId: 'subunit-1',
    carId: null,
    createdById: 'user-1',
    notes: null,
    priority: 1,
    completedAt: null,
    deletedAt: null,
    deletedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock Leaves
export const mockLeaves = [
  {
    id: 'leave-1',
    userId: 'user-1',
    type: 'PERSONAL',
    startDate: new Date(),
    endDate: new Date(),
    totalDays: 1,
    reason: 'ธุระส่วนตัว',
    status: LeaveStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock Cars
export const mockCars = [
  {
    id: 'car-1',
    licensePlate: 'กข-1234',
    brand: 'Toyota',
    model: 'Hilux',
    color: 'White',
    status: CarStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock Notifications
export const mockNotifications = [
  {
    id: 'notif-1',
    userId: 'user-1',
    title: 'ยินดีต้อนรับ',
    message: 'ยินดีต้อนรับสู่ระบบ',
    type: 'INFO',
    isRead: false,
    createdAt: new Date(),
  },
];

// Mock Dashboard Stats
export const mockDashboardStats = {
  totalTasks: 10,
  waitingTasks: 3,
  inProgressTasks: 4,
  completedTasks: 3,
  cancelledTasks: 0,
  todayTasks: 2,
  pendingLeaves: 1,
  availableCars: 5,
};
