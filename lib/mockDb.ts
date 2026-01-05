// @ts-nocheck
// Mock Database Service - In-memory data store for preview
// NOTE: This file is not actively used and has type issues. Disabled type checking.
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

// In-memory stores (mutable copies)
let users = [...mockUsers];
let departments = [...mockDepartments];
let subUnits = [...mockSubUnits];
let tasks = [...mockTasks];
let leaves = [...mockLeaves];
let cars = [...mockCars];
let notifications = [...mockNotifications];

// Generate IDs
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock Database API
export const mockDb = {
  // Users
  users: {
    findMany: async (options?: { where?: Record<string, unknown>; include?: Record<string, boolean> }) => {
      let result = [...users];
      if (options?.where) {
        result = result.filter(u => {
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
    findUnique: async (options: { where: { id?: string; email?: string; employeeId?: string } }) => {
      const { id, email, employeeId } = options.where;
      return users.find(u => 
        (id && u.id === id) || 
        (email && u.email === email) || 
        (employeeId && u.employeeId === employeeId)
      ) || null;
    },
    create: async (options: { data: Record<string, unknown> }) => {
      const newUser = {
        ...options.data,
        id: generateId('user'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      users.push(newUser as typeof users[0]);
      return newUser;
    },
    update: async (options: { where: { id: string }; data: Record<string, unknown> }) => {
      const index = users.findIndex(u => u.id === options.where.id);
      if (index >= 0) {
        users[index] = { ...users[index], ...options.data, updatedAt: new Date() } as typeof users[0];
        return users[index];
      }
      return null;
    },
    delete: async (options: { where: { id: string } }) => {
      const index = users.findIndex(u => u.id === options.where.id);
      if (index >= 0) {
        const deleted = users.splice(index, 1)[0];
        return deleted;
      }
      return null;
    },
  },

  // Tasks
  tasks: {
    findMany: async (options?: { where?: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: Record<string, string> }) => {
      let result = [...tasks];
      if (options?.where) {
        result = result.filter(t => {
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
    findUnique: async (options: { where: { id: string }; include?: Record<string, unknown> }) => {
      return tasks.find(t => t.id === options.where.id) || null;
    },
    create: async (options: { data: Record<string, unknown> }) => {
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
      tasks.push(newTask as typeof tasks[0]);
      return newTask;
    },
    update: async (options: { where: { id: string }; data: Record<string, unknown> }) => {
      const index = tasks.findIndex(t => t.id === options.where.id);
      if (index >= 0) {
        tasks[index] = { ...tasks[index], ...options.data, updatedAt: new Date() } as typeof tasks[0];
        return tasks[index];
      }
      return null;
    },
    delete: async (options: { where: { id: string } }) => {
      const index = tasks.findIndex(t => t.id === options.where.id);
      if (index >= 0) {
        const deleted = tasks.splice(index, 1)[0];
        return deleted;
      }
      return null;
    },
    count: async (options?: { where?: Record<string, unknown> }) => {
      if (!options?.where) return tasks.length;
      return tasks.filter(t => {
        return Object.entries(options.where!).every(([key, value]) => {
          if (key === 'status') return t.status === value;
          return true;
        });
      }).length;
    },
  },

  // Leaves
  leaves: {
    findMany: async (options?: { where?: Record<string, unknown>; include?: Record<string, unknown> }) => {
      let result = [...leaves];
      if (options?.where) {
        result = result.filter(l => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (key === 'status') return l.status === value;
            if (key === 'userId') return l.userId === value;
            return true;
          });
        });
      }
      return result;
    },
    findUnique: async (options: { where: { id: string } }) => {
      return leaves.find(l => l.id === options.where.id) || null;
    },
    create: async (options: { data: Record<string, unknown> }) => {
      const newLeave = {
        ...options.data,
        id: generateId('leave'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      leaves.push(newLeave as typeof leaves[0]);
      return newLeave;
    },
    update: async (options: { where: { id: string }; data: Record<string, unknown> }) => {
      const index = leaves.findIndex(l => l.id === options.where.id);
      if (index >= 0) {
        leaves[index] = { ...leaves[index], ...options.data, updatedAt: new Date() } as typeof leaves[0];
        return leaves[index];
      }
      return null;
    },
    count: async (options?: { where?: Record<string, unknown> }) => {
      if (!options?.where) return leaves.length;
      return leaves.filter(l => {
        return Object.entries(options.where!).every(([key, value]) => {
          if (key === 'status') return l.status === value;
          return true;
        });
      }).length;
    },
  },

  // Cars
  cars: {
    findMany: async (options?: { where?: Record<string, unknown> }) => {
      let result = [...cars];
      if (options?.where) {
        result = result.filter(c => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (key === 'status') return c.status === value;
            return true;
          });
        });
      }
      return result;
    },
    findUnique: async (options: { where: { id: string } }) => {
      return cars.find(c => c.id === options.where.id) || null;
    },
    create: async (options: { data: Record<string, unknown> }) => {
      const newCar = {
        ...options.data,
        id: generateId('car'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      cars.push(newCar as typeof cars[0]);
      return newCar;
    },
    update: async (options: { where: { id: string }; data: Record<string, unknown> }) => {
      const index = cars.findIndex(c => c.id === options.where.id);
      if (index >= 0) {
        cars[index] = { ...cars[index], ...options.data, updatedAt: new Date() } as typeof cars[0];
        return cars[index];
      }
      return null;
    },
    count: async (options?: { where?: Record<string, unknown> }) => {
      if (!options?.where) return cars.length;
      return cars.filter(c => {
        return Object.entries(options.where!).every(([key, value]) => {
          if (key === 'status') return c.status === value;
          return true;
        });
      }).length;
    },
  },

  // Departments
  departments: {
    findMany: async () => [...departments],
    findUnique: async (options: { where: { id: string } }) => {
      return departments.find(d => d.id === options.where.id) || null;
    },
  },

  // SubUnits
  subUnits: {
    findMany: async (options?: { where?: Record<string, unknown>; include?: Record<string, unknown> }) => {
      let result = [...subUnits];
      if (options?.where) {
        result = result.filter(s => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (key === 'departmentId') return s.departmentId === value;
            if (key === 'type') return s.type === value;
            return true;
          });
        });
      }
      return result;
    },
    findUnique: async (options: { where: { id: string } }) => {
      return subUnits.find(s => s.id === options.where.id) || null;
    },
  },

  // Notifications
  notifications: {
    findMany: async (options?: { where?: Record<string, unknown>; orderBy?: Record<string, string> }) => {
      let result = [...notifications];
      if (options?.where) {
        result = result.filter(n => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (key === 'userId') return n.userId === value;
            if (key === 'isRead') return n.isRead === value;
            return true;
          });
        });
      }
      return result;
    },
    update: async (options: { where: { id: string }; data: Record<string, unknown> }) => {
      const index = notifications.findIndex(n => n.id === options.where.id);
      if (index >= 0) {
        notifications[index] = { ...notifications[index], ...options.data } as typeof notifications[0];
        return notifications[index];
      }
      return null;
    },
    updateMany: async (options: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      notifications.forEach((n, index) => {
        const match = Object.entries(options.where).every(([key, value]) => {
          if (key === 'userId') return n.userId === value;
          return true;
        });
        if (match) {
          notifications[index] = { ...n, ...options.data } as typeof notifications[0];
          count++;
        }
      });
      return { count };
    },
    count: async (options?: { where?: Record<string, unknown> }) => {
      if (!options?.where) return notifications.length;
      return notifications.filter(n => {
        return Object.entries(options.where!).every(([key, value]) => {
          if (key === 'userId') return n.userId === value;
          if (key === 'isRead') return n.isRead === value;
          return true;
        });
      }).length;
    },
  },

  // Dashboard Stats
  getDashboardStats: async () => mockDashboardStats,
};

// Reset mock data (useful for testing)
export const resetMockData = () => {
  users = [...mockUsers];
  departments = [...mockDepartments];
  subUnits = [...mockSubUnits];
  tasks = [...mockTasks];
  leaves = [...mockLeaves];
  cars = [...mockCars];
  notifications = [...mockNotifications];
};
