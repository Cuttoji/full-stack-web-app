// TypeScript Types & Interfaces for Task & Resource Management System

// ==================== ENUMS ====================

export enum Role {
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
  SALES = 'SALES',
  HEAD_TECH = 'HEAD_TECH',
  LEADER = 'LEADER',
  TECH = 'TECH',
}

export enum TaskStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum LeaveType {
  SICK = 'SICK',
  PERSONAL = 'PERSONAL',
  VACATION = 'VACATION',
  OTHER = 'OTHER',
}

export enum SubUnitType {
  RENTAL = 'RENTAL',
  INSTALLATION = 'INSTALLATION',
  PRINTER = 'PRINTER',
}

export enum CarStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

// ==================== INTERFACES ====================

export interface Department {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  users?: User[];
  subUnits?: SubUnit[];
}

export interface SubUnit {
  id: string;
  name: string;
  type: SubUnitType;
  departmentId: string;
  department?: Department;
  users?: User[];
  tasks?: Task[];
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  employeeId: string;
  email: string;
  password?: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: Role;
  departmentId?: string;
  subUnitId?: string;
  leaveQuota: number;
  leaveUsed: number;
  isActive: boolean;
  permissions?: UserPermissions;
  createdAt: Date;
  updatedAt: Date;
  department?: Department;
  subUnit?: SubUnit;
}

export interface UserPermissions {
  canViewAllCalendars?: boolean;
  canEditTaskDetails?: boolean;
  canDeleteTasks?: boolean;
  canBookVehicles?: boolean;
  canManageFleet?: boolean;
  canCreateTasks?: boolean;
  canAssignTasks?: boolean;
  canApproveLeave?: boolean;
  canManageUsers?: boolean;
  canManageTasks?: boolean;
  canManageDailyTechnician?: boolean;
}

export interface Car {
  id: string;
  licensePlate: string;
  plateNumber?: string; // Alias for licensePlate
  name?: string;
  brand: string;
  model?: string;
  year?: number;
  mileage?: number;
  status: CarStatus;
  lastMaintenanceDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  tasks?: Task[];
}

export interface Task {
  id: string;
  jobNumber: string;
  title: string;
  description?: string;
  location?: string;
  customerName?: string;
  customerPhone?: string;
  scheduledDate: Date;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  status: TaskStatus;
  isLoop: boolean;
  loopPattern?: string;
  loopInterval?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  loopEndDate?: Date;
  parentTaskId?: string;
  subUnitId?: string;
  carId?: string;
  createdById: string;
  notes?: string;
  priority: number;
  completedAt?: Date;
  deletedAt?: Date | null; // Soft delete - ถังขยะ 30 วัน
  createdAt: Date;
  updatedAt: Date;
  subUnit?: SubUnit;
  car?: Car;
  createdBy?: User;
  parentTask?: Task;
  childTasks?: Task[];
  assignments?: TaskAssignment[];
  images?: TaskImage[];
  printerLogs?: PrinterLog[];
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  isLead: boolean;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
  task?: Task;
  user?: User;
}

export interface TaskImage {
  id: string;
  taskId: string;
  uploadedBy: string;
  url: string;
  imageUrl: string;
  imageType: 'BEFORE' | 'AFTER' | 'EVIDENCE';
  description?: string;
  createdAt: Date;
  task?: Task;
  user?: User;
}

export interface PrinterLog {
  id: string;
  taskId: string;
  technicianId: string;
  printerModel?: string;
  serialNumber?: string;
  problemDescription: string;
  symptom: string;
  diagnosis?: string;
  solution: string;
  partsUsed?: string;
  partsDetail?: PartDetail[];
  laborTime?: number;
  rating?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  task?: Task;
  technician?: User;
}

export interface PartDetail {
  name: string;
  quantity: number;
  price?: number;
}

export interface Leave {
  id: string;
  userId: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
  approvedById?: string;
  approverNote?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  approver?: User;
  approvedBy?: User;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'TASK' | 'LEAVE' | 'CONFLICT' | 'SYSTEM';
  link?: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
  user?: User;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  entityType: string;
  entityId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  taskId?: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  deviceId?: string;
  createdAt: Date;
  user?: User;
  task?: Task;
}

// ==================== API TYPES ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface AuthUser {
  id: string;
  employeeId: string;
  email: string;
  name: string;
  role: Role;
  departmentId?: string;
  subUnitId?: string;
  avatar?: string;
  leaveQuota?: number;
  phone?: string;
  department?: Department;
  subUnit?: SubUnit;
}

// Task Types
export interface CreateTaskRequest {
  title: string;
  description?: string;
  location?: string;
  customerName?: string;
  customerPhone?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isLoop?: boolean;
  loopPattern?: string;
  loopEndDate?: string;
  subUnitId?: string;
  carId?: string;
  assigneeIds?: string[];
  priority?: number;
  notes?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
}

export interface AssignTaskRequest {
  taskId: string;
  assigneeIds: string[];
  carId?: string;
}

export interface UpdateTaskStatusRequest {
  taskId: string;
  status: TaskStatus;
  images?: string[]; // Base64 or URLs
  printerLog?: CreatePrinterLogRequest;
}

// Printer Log Types
export interface CreatePrinterLogRequest {
  taskId?: string;
  printerModel?: string;
  serialNumber?: string;
  problemDescription: string;
  symptom?: string;
  diagnosis?: string;
  solution: string;
  partsUsed?: string;
  partsDetail?: PartDetail[];
  laborTime?: number;
  notes?: string;
}

// Leave Types
export interface CreateLeaveRequest {
  type: LeaveType | 'SICK' | 'PERSONAL' | 'VACATION' | 'OTHER';
  startDate: string;
  endDate: string;
  totalDays?: number;
  reason?: string;
}

export interface ApproveLeaveRequest {
  leaveId: string;
  approved: boolean;
  rejectedReason?: string;
}

// Car Types
export interface CreateCarRequest {
  licensePlate?: string;
  plateNumber?: string;  // Alternative name
  name?: string;
  brand?: string;
  model?: string;
  type?: string;
  description?: string;
  year?: number;
  status?: CarStatus;
  mileage?: number;
  lastMaintenanceDate?: string;
  notes?: string;
}

export interface UpdateCarRequest extends Partial<CreateCarRequest> {
  status?: CarStatus;
}

// User Types
export interface CreateUserRequest {
  employeeId?: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: Role;
  departmentId: string;
  subUnitId?: string;
  leaveQuota?: number;
  permissions?: UserPermissions;
}

export interface UpdateUserRequest extends Partial<Omit<CreateUserRequest, 'password'>> {
  isActive?: boolean;
  newPassword?: string;
  permissions?: UserPermissions;
}

// Conflict Check Types
export interface ConflictCheckRequest {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  assigneeIds?: string[];
  carId?: string;
  excludeTaskId?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  userConflicts: UserConflict[];
  carConflicts: CarConflict[];
}

export interface UserConflict {
  userId: string;
  userName: string;
  conflictingTasks: TaskConflict[];
}

export interface CarConflict {
  carId: string;
  carName: string;
  plateNumber: string;
  conflictingTasks: TaskConflict[];
}

export interface TaskConflict {
  taskId: string;
  jobNumber: string;
  title: string;
  startDate: Date;
  endDate: Date;
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: TaskStatus;
  color: string;
  task: Task;
}

// Dashboard Types
export interface DashboardStats {
  totalTasks: number;
  waitingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  todayTasks: number;
  pendingLeaves: number;
  availableCars: number;
}

export interface LeaderDashboardStats extends DashboardStats {
  teamMembersCount: number;
  teamOnLeaveToday: number;
  pendingLeaveRequests: number;
}

// Offline Sync Types
export interface OfflineAction {
  id: string;
  action: string;
  endpoint: string;
  method: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors?: string[];
}

// Status Color Mapping
export const TaskStatusColors: Record<TaskStatus, string> = {
  [TaskStatus.WAITING]: '#9CA3AF', // Gray
  [TaskStatus.IN_PROGRESS]: '#3B82F6', // Blue
  [TaskStatus.DONE]: '#22C55E', // Green
  [TaskStatus.CANCELLED]: '#EF4444', // Red
};

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.WAITING]: 'รอรับงาน',
  [TaskStatus.IN_PROGRESS]: 'กำลังทำ',
  [TaskStatus.DONE]: 'จบงาน',
  [TaskStatus.CANCELLED]: 'ยกเลิก',
};

export const LeaveTypeLabels: Record<LeaveType, string> = {
  [LeaveType.SICK]: 'ลาป่วย',
  [LeaveType.PERSONAL]: 'ลากิจ',
  [LeaveType.VACATION]: 'ลาพักร้อน',
  [LeaveType.OTHER]: 'อื่นๆ',
};

export const LeaveStatusLabels: Record<LeaveStatus, string> = {
  [LeaveStatus.PENDING]: 'รออนุมัติ',
  [LeaveStatus.APPROVED]: 'อนุมัติ',
  [LeaveStatus.REJECTED]: 'ไม่อนุมัติ',
  [LeaveStatus.CANCELLED]: 'ยกเลิก',
};

export const RoleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'ผู้ดูแลระบบ',
  [Role.FINANCE]: 'การเงิน',
  [Role.SALES]: 'ฝ่ายขาย',
  [Role.HEAD_TECH]: 'หัวหน้าช่าง',
  [Role.LEADER]: 'หัวหน้ากลุ่ม',
  [Role.TECH]: 'ช่าง',
};

export const SubUnitTypeLabels: Record<SubUnitType, string> = {
  [SubUnitType.RENTAL]: 'เครื่องเช่า',
  [SubUnitType.INSTALLATION]: 'ติดตั้ง',
  [SubUnitType.PRINTER]: 'ปริ้นเตอร์',
};

// Alias exports for backward compatibility
export const STATUS_LABELS = TaskStatusLabels;
export const LEAVE_STATUS_LABELS = LeaveStatusLabels;
export const LEAVE_TYPE_LABELS = LeaveTypeLabels;
export const ROLE_LABELS = RoleLabels;
export const SUB_UNIT_LABELS = SubUnitTypeLabels;
export const CAR_STATUS_LABELS: Record<CarStatus, string> = {
  [CarStatus.AVAILABLE]: 'ว่าง',
  [CarStatus.IN_USE]: 'ใช้งานอยู่',
  [CarStatus.MAINTENANCE]: 'ซ่อมบำรุง',
  [CarStatus.OUT_OF_SERVICE]: 'ไม่พร้อมใช้งาน',
};
export const CarStatusLabels = CAR_STATUS_LABELS;
