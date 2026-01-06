// Mock Database Service - In-memory data store for preview
// NOTE: This file provides proper type annotations for all operations

import {
  mockUsers,
  mockDepartments,
  mockSubUnits,
  mockTasks,
  mockLeaves,
  mockCars,
  mockNotifications,
  mockDashboardStats,
} from './mockData';

// Enable mock mode via environment variable
// Set USE_MOCK_DB=true in .env to use mock data instead of real database
export const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';

// Type definitions based on mock data
type MockUser = (typeof mockUsers)[number];
type MockDepartment = (typeof mockDepartments)[number];
type MockSubUnit = (typeof mockSubUnits)[number];
type MockTask = (typeof mockTasks)[number];
type MockLeave = (typeof mockLeaves)[number];
type MockCar = (typeof mockCars)[number];
type MockNotification = (typeof mockNotifications)[number];

// In-memory stores (mutable copies)
let users: MockUser[] = [...mockUsers];
let departments: MockDepartment[] = [...mockDepartments];
let subUnits: MockSubUnit[] = [...mockSubUnits];
let tasks: MockTask[] = [...mockTasks];
let leaves: MockLeave[] = [...mockLeaves];
let cars: MockCar[] = [...mockCars];
let notifications: MockNotification[] = [...mockNotifications];

// Generate IDs
const generateId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper type for where clause matching
type WhereClause = Record<string, unknown>;

// Mock Database API
export const mockDb = {
  // Users
  users: {
    findMany: async (options?: { where?: WhereClause; include?: Record<string, boolean> }): Promise<MockUser[]> => {
      let result = [...users];
      if (options?.where) {
        result = result.filter((u: MockUser) => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (key === 'isActive') return u.isActive === value;
            if (key === 'departmentId') return u.departmentId === value;
            if (key === 'subUnitId') return u.subUnitId === value;
            if (key === 'role') return u.role === value;
            return true;
          });
        });
      }
      return result;
    },
    findUnique: async (options: { where: { id?: string; email?: string; employeeId?: string } }): Promise<MockUser | null> => {
      const { id, email, employeeId } = options.where;
      return users.find((u: MockUser) => 
        (id && u.id === id) || 
        (email && u.email === email) || 
        (employeeId && u.employeeId === employeeId)
      ) || null;
    },
    create: async (options: { data: Record<string, unknown> }): Promise<Record<string, unknown>> => {
      const newUser = {
        ...options.data,
        id: generateId('user'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      users.push(newUser as MockUser);
      return newUser;
    },
    update: async (options: { where: { id: string }; data: Record<string, unknown> }): Promise<MockUser | null> => {
      const index = users.findIndex((u: MockUser) => u.id === options.where.id);
      if (index >= 0) {
        users[index] = { ...users[index], ...options.data, updatedAt: new Date() } as MockUser;
        return users[index];
      }
      return null;
    },
    delete: async (options: { where: { id: string } }): Promise<MockUser | null> => {
      const index = users.findIndex((u: MockUser) => u.id === options.where.id);
      if (index >= 0) {
        const deleted = users.splice(index, 1)[0];
        return deleted;
      }
      return null;
    },
  },

  // Tasks
  tasks: {
    findMany: async (options?: { where?: WhereClause; include?: Record<string, unknown>; orderBy?: Record<string, string> }): Promise<MockTask[]> => {
      let result = [...tasks];
      if (options?.where) {
        result = result.filter((t: MockTask) => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (key === 'status') return t.status === value;
            if (key === 'subUnitId') return t.subUnitId === value;
            if (key === 'scheduledDate') {
              const taskDate = new Date(t.scheduledDate).toDateString();
              if (typeof value === 'object' && value !== null) {
                const v = value as { gte?: Date; lte?: Date };
                if (v.gte && v.lte) {
                  const date = new Date(t.scheduledDate);
                  return date >= v.gte && date <= v.lte;
                }
              }
              return taskDate === new Date(value as string).toDateString();
            }
            return true;
          });
        });
      }
      return result;
    },
    findUnique: async (options: { where: { id: string }; include?: Record<string, unknown> }): Promise<MockTask | null> => {
      return tasks.find((t: MockTask) => t.id === options.where.id) || null;
    },
    create: async (options: { data: Record<string, unknown> }): Promise<Record<string, unknown>> => {
      const newTask = {
        ...options.data,
        id: generateId('task'),
        jobNumber: `JOB-${new Date().getFullYear()}-${String(tasks.length + 1).padStart(3, '0')}`,
        assignments: [],
        images: [],
        printerLogs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tasks.push(newTask as unknown as MockTask);
      return newTask;
    },
    update: async (options: { where: { id: string }; data: Record<string, unknown> }): Promise<MockTask | null> => {
      const index = tasks.findIndex((t: MockTask) => t.id === options.where.id);
      if (index >= 0) {
        tasks[index] = { ...tasks[index], ...options.data, updatedAt: new Date() } as MockTask;
        return tasks[index];
      }
      return null;
    },
    delete: async (options: { where: { id: string } }): Promise<MockTask | null> => {
      const index = tasks.findIndex((t: MockTask) => t.id === options.where.id);
      if (index >= 0) {
        const deleted = tasks.splice(index, 1)[0];
        return deleted;
      }
      return null;
    },
    count: async (options?: { where?: WhereClause }): Promise<number> => {
      if (!options?.where) return tasks.length;
      return tasks.filter((t: MockTask) => {
        return Object.entries(options.where!).every(([key, value]) => {
          if (key === 'status') return t.status === value;
          return true;
        });
      }).length;
    },
  },

  // Leaves
  leaves: {
    findMany: async (options?: { where?: WhereClause; include?: Record<string, unknown> }): Promise<MockLeave[]> => {
      let result = [...leaves];
      if (options?.where) {
        result = result.filter((l: MockLeave) => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (key === 'status') return l.status === value;
            if (key === 'userId') return l.userId === value;
            return true;
          });
        });
      }
      return result;
    },
    findUnique: async (options: { where: { id: string } }): Promise<MockLeave | null> => {
      return leaves.find((l: MockLeave) => l.id === options.where.id) || null;
    },
    create: async (options: { data: Record<string, unknown> }): Promise<Record<string, unknown>> => {
      const newLeave = {
        ...options.data,
        id: generateId('leave'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      leaves.push(newLeave as MockLeave);
      return newLeave;
    },
    update: async (options: { where: { id: string }; data: Record<string, unknown> }): Promise<MockLeave | null> => {
      const index = leaves.findIndex((l: MockLeave) => l.id === options.where.id);
      if (index >= 0) {
        leaves[index] = { ...leaves[index], ...options.data, updatedAt: new Date() } as MockLeave;
        return leaves[index];
      }
      return null;
    },
    count: async (options?: { where?: WhereClause }): Promise<number> => {
      if (!options?.where) return leaves.length;
      return leaves.filter((l: MockLeave) => {
        return Object.entries(options.where!).every(([key, value]) => {
          if (key === 'status') return l.status === value;
          return true;
        });
      }).length;
    },
  },

  // Cars
  cars: {
    findMany: async (options?: { where?: WhereClause }): Promise<MockCar[]> => {
      let result = [...cars];
      if (options?.where) {
        result = result.filter((c: MockCar) => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (key === 'status') return c.status === value;
            return true;
          });
        });
      }
      return result;
    },
    findUnique: async (options: { where: { id: string } }): Promise<MockCar | null> => {
      return cars.find((c: MockCar) => c.id === options.where.id) || null;
    },
    create: async (options: { data: Record<string, unknown> }): Promise<Record<string, unknown>> => {
      const newCar = {
        ...options.data,
        id: generateId('car'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      cars.push(newCar as MockCar);
      return newCar;
    },
    update: async (options: { where: { id: string }; data: Record<string, unknown> }): Promise<MockCar | null> => {
      const index = cars.findIndex((c: MockCar) => c.id === options.where.id);
      if (index >= 0) {
        cars[index] = { ...cars[index], ...options.data, updatedAt: new Date() } as MockCar;
        return cars[index];
      }
      return null;
    },
    count: async (options?: { where?: WhereClause }): Promise<number> => {
      if (!options?.where) return cars.length;
      return cars.filter((c: MockCar) => {
        return Object.entries(options.where!).every(([key, value]) => {
          if (key === 'status') return c.status === value;
          return true;
        });
      }).length;
    },
  },

  // Departments
  departments: {
    findMany: async (): Promise<MockDepartment[]> => [...departments],
    findUnique: async (options: { where: { id: string } }): Promise<MockDepartment | null> => {
      return departments.find((d: MockDepartment) => d.id === options.where.id) || null;
    },
  },

  // SubUnits
  subUnits: {
    findMany: async (options?: { where?: WhereClause; include?: Record<string, unknown> }): Promise<MockSubUnit[]> => {
      let result = [...subUnits];
      if (options?.where) {
        result = result.filter((s: MockSubUnit) => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (key === 'departmentId') return s.departmentId === value;
            if (key === 'type') return s.type === value;
            return true;
          });
        });
      }
      return result;
    },
    findUnique: async (options: { where: { id: string } }): Promise<MockSubUnit | null> => {
      return subUnits.find((s: MockSubUnit) => s.id === options.where.id) || null;
    },
  },

  // Notifications
  notifications: {
    findMany: async (options?: { where?: WhereClause; orderBy?: Record<string, string> }): Promise<MockNotification[]> => {
      let result = [...notifications];
      if (options?.where) {
        result = result.filter((n: MockNotification) => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (key === 'userId') return n.userId === value;
            if (key === 'isRead') return n.isRead === value;
            return true;
          });
        });
      }
      return result;
    },
    update: async (options: { where: { id: string }; data: Record<string, unknown> }): Promise<MockNotification | null> => {
      const index = notifications.findIndex((n: MockNotification) => n.id === options.where.id);
      if (index >= 0) {
        notifications[index] = { ...notifications[index], ...options.data } as MockNotification;
        return notifications[index];
      }
      return null;
    },
    updateMany: async (options: { where: WhereClause; data: Record<string, unknown> }): Promise<{ count: number }> => {
      let count = 0;
      notifications.forEach((n: MockNotification, index: number) => {
        const match = Object.entries(options.where).every(([key, value]) => {
          if (key === 'userId') return n.userId === value;
          return true;
        });
        if (match) {
          notifications[index] = { ...n, ...options.data } as MockNotification;
          count++;
        }
      });
      return { count };
    },
    count: async (options?: { where?: WhereClause }): Promise<number> => {
      if (!options?.where) return notifications.length;
      return notifications.filter((n: MockNotification) => {
        return Object.entries(options.where!).every(([key, value]) => {
          if (key === 'userId') return n.userId === value;
          if (key === 'isRead') return n.isRead === value;
          return true;
        });
      }).length;
    },
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<typeof mockDashboardStats> => mockDashboardStats,
};

// Reset mock data (useful for testing)
export const resetMockData = (): void => {
  users = [...mockUsers];
  departments = [...mockDepartments];
  subUnits = [...mockSubUnits];
  tasks = [...mockTasks];
  leaves = [...mockLeaves];
  cars = [...mockCars];
  notifications = [...mockNotifications];
};
