// TypeScript Types & Interfaces for Task & Resource Management System

// ==================== ENUMS ====================

export enum Role {
  ADMIN = 'ADMIN',               // ผู้บริหารสูงสุด
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE', // ฝ่ายบริการลูกค้า
  FINANCE_LEADER = 'FINANCE_LEADER',     // หัวหน้าฝ่ายการเงิน
  FINANCE = 'FINANCE',           // เจ้าหน้าที่การเงิน
  SALES_LEADER = 'SALES_LEADER', // หัวหน้าฝ่ายขาย
  SALES = 'SALES',               // พนักงานขาย
  HEAD_TECH = 'HEAD_TECH',       // หัวหน้าแผนกช่าง
  LEADER = 'LEADER',             // หัวหน้าทีม
  TECH = 'TECH',                 // ช่าง
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
  RENTAL = 'RENTAL',             // ทีมเครื่องเช่า
  INSTALLATION = 'INSTALLATION', // ทีมติดตั้ง (กล้องวงจรปิด ฯลฯ)
  PRINTER = 'PRINTER',           // ทีมปริ้นเตอร์
  IT = 'IT',                     // ทีมไอที (IT Install)
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
  supervisorId?: string;        // ผู้บังคับบัญชาโดยตรง (สำหรับ Hierarchical Approval)
  leaveQuota: number;
  leaveUsed: number;
  isActive: boolean;
  permissions?: UserPermissions;
  permissionScope?: PermissionScope; // Scope ของสิทธิ์
  createdAt: Date;
  updatedAt: Date;
  department?: Department;
  subUnit?: SubUnit;
  supervisor?: User;            // ผู้บังคับบัญชา
  subordinates?: User[];        // ผู้ใต้บังคับบัญชา
}

// ==================== PERMISSION SYSTEM ====================

// ขอบเขตของสิทธิ์ (Permission Scope)
export type PermissionScopeType = 'ALL' | 'DEPARTMENT' | 'SUBUNIT' | 'TEAM' | 'SELF';

export interface PermissionScope {
  type: PermissionScopeType;
  departmentIds?: string[];     // ถ้า type = DEPARTMENT
  subUnitIds?: string[];        // ถ้า type = SUBUNIT
  userIds?: string[];           // ถ้า type = TEAM (เฉพาะทีมที่กำหนด)
}

export interface UserPermissions {
  // Task Permissions
  canViewTasks?: boolean;
  canCreateTasks?: boolean;
  canEditTaskDetails?: boolean;
  canDeleteTasks?: boolean;
  canAssignTasks?: boolean;
  canManageTasks?: boolean;
  
  // Calendar Permissions
  canViewAllCalendars?: boolean;
  canViewTeamCalendar?: boolean;
  
  // Vehicle Permissions
  canBookVehicles?: boolean;
  canManageFleet?: boolean;
  
  // Leave Permissions
  canApproveLeave?: boolean;
  canViewLeaveRequests?: boolean;
  
  // User Management
  canManageUsers?: boolean;
  canViewAllUsers?: boolean;
  
  // Daily Operations
  canManageDailyTechnician?: boolean;
  
  // Reports
  canViewReports?: boolean;
  canExportData?: boolean;
}

// ==================== ROLE HIERARCHY & DEFAULT PERMISSIONS ====================

// ลำดับชั้นของ Role (สำหรับ Hierarchical Approval)
export const RoleHierarchy: Record<Role, number> = {
  [Role.ADMIN]: 100,
  [Role.CUSTOMER_SERVICE]: 50,
  [Role.FINANCE_LEADER]: 60,
  [Role.FINANCE]: 40,
  [Role.SALES_LEADER]: 60,
  [Role.SALES]: 40,
  [Role.HEAD_TECH]: 70,
  [Role.LEADER]: 50,
  [Role.TECH]: 30,
};

// ใครอนุมัติใบลาของใคร
export const LeaveApprovalChain: Record<Role, Role[]> = {
  [Role.TECH]: [Role.LEADER, Role.HEAD_TECH],           // ช่าง → หัวหน้าทีม หรือ หัวหน้าแผนก
  [Role.LEADER]: [Role.HEAD_TECH],                       // หัวหน้าทีม → หัวหน้าแผนก
  [Role.HEAD_TECH]: [Role.ADMIN],                        // หัวหน้าแผนก → ผู้บริหาร
  [Role.SALES]: [Role.SALES_LEADER],                     // พนักงานขาย → หัวหน้าฝ่ายขาย
  [Role.SALES_LEADER]: [Role.ADMIN],                     // หัวหน้าฝ่ายขาย → ผู้บริหาร
  [Role.FINANCE]: [Role.FINANCE_LEADER],                 // เจ้าหน้าที่การเงิน → หัวหน้าการเงิน
  [Role.FINANCE_LEADER]: [Role.ADMIN],                   // หัวหน้าการเงิน → ผู้บริหาร
  [Role.CUSTOMER_SERVICE]: [Role.ADMIN],                 // ฝ่ายบริการลูกค้า → ผู้บริหาร
  [Role.ADMIN]: [],                                       // ผู้บริหาร → ไม่ต้องมีใครอนุมัติ (หรืออนุมัติตัวเอง)
};

// Default Permissions ตาม Role
export const DefaultRolePermissions: Record<Role, UserPermissions> = {
  [Role.ADMIN]: {
    canViewTasks: true,
    canCreateTasks: true,
    canEditTaskDetails: true,
    canDeleteTasks: true,
    canAssignTasks: true,
    canManageTasks: true,
    canViewAllCalendars: true,
    canViewTeamCalendar: true,
    canBookVehicles: true,
    canManageFleet: true,
    canApproveLeave: true,
    canViewLeaveRequests: true,
    canManageUsers: true,
    canViewAllUsers: true,
    canManageDailyTechnician: true,
    canViewReports: true,
    canExportData: true,
  },
  [Role.CUSTOMER_SERVICE]: {
    canViewTasks: true,
    canCreateTasks: true,
    canEditTaskDetails: true,
    canViewAllCalendars: true,
    canViewTeamCalendar: true,
    canBookVehicles: true,
    canViewLeaveRequests: true,
    canViewAllUsers: true,
    canViewReports: true,
  },
  [Role.FINANCE_LEADER]: {
    canViewTasks: true,
    canViewAllCalendars: true,
    canViewTeamCalendar: true,
    canApproveLeave: true,
    canViewLeaveRequests: true,
    canManageUsers: true,
    canViewAllUsers: true,
    canViewReports: true,
    canExportData: true,
  },
  [Role.FINANCE]: {
    canViewTasks: true,
    canViewTeamCalendar: true,
    canViewLeaveRequests: true,
    canViewReports: true,
  },
  [Role.SALES_LEADER]: {
    canViewTasks: true,
    canCreateTasks: true,
    canViewAllCalendars: true,
    canViewTeamCalendar: true,
    canApproveLeave: true,
    canViewLeaveRequests: true,
    canManageUsers: true,
    canViewAllUsers: true,
    canViewReports: true,
  },
  [Role.SALES]: {
    canViewTasks: true,
    canCreateTasks: true,
    canViewTeamCalendar: true,
    canViewReports: true,
  },
  [Role.HEAD_TECH]: {
    canViewTasks: true,
    canCreateTasks: true,
    canEditTaskDetails: true,
    canDeleteTasks: true,
    canAssignTasks: true,
    canManageTasks: true,
    canViewAllCalendars: true,
    canViewTeamCalendar: true,
    canBookVehicles: true,
    canManageFleet: true,
    canApproveLeave: true,
    canViewLeaveRequests: true,
    canManageUsers: true,
    canViewAllUsers: true,
    canManageDailyTechnician: true,
    canViewReports: true,
    canExportData: true,
  },
  [Role.LEADER]: {
    canViewTasks: true,
    canCreateTasks: true,
    canEditTaskDetails: true,
    canAssignTasks: true,
    canViewTeamCalendar: true,
    canBookVehicles: true,
    canApproveLeave: true,
    canViewLeaveRequests: true,
    canManageDailyTechnician: true,
    canViewReports: true,
  },
  [Role.TECH]: {
    canViewTasks: true,
    canViewTeamCalendar: true,
    canBookVehicles: true,
  },
};

// Default Permission Scope ตาม Role
export const DefaultRoleScope: Record<Role, PermissionScope> = {
  [Role.ADMIN]: { type: 'ALL' },
  [Role.CUSTOMER_SERVICE]: { type: 'ALL' },
  [Role.FINANCE_LEADER]: { type: 'DEPARTMENT' },
  [Role.FINANCE]: { type: 'SELF' },
  [Role.SALES_LEADER]: { type: 'DEPARTMENT' },
  [Role.SALES]: { type: 'SELF' },
  [Role.HEAD_TECH]: { type: 'DEPARTMENT' },
  [Role.LEADER]: { type: 'SUBUNIT' },
  [Role.TECH]: { type: 'SELF' },
};

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
  
  // Hierarchical Approval
  currentApproverId?: string;       // ผู้ที่ต้องอนุมัติปัจจุบัน
  approvalChain?: LeaveApproval[];  // ประวัติการอนุมัติตามลำดับชั้น
  approvalLevel?: number;           // ระดับการอนุมัติปัจจุบัน
  
  // Legacy fields (for backward compatibility)
  approvedById?: string;
  approverNote?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  approver?: User;
  approvedBy?: User;
  currentApprover?: User;
}

// ประวัติการอนุมัติตามลำดับชั้น
export interface LeaveApproval {
  id: string;
  leaveId: string;
  approverId: string;
  approverRole: Role;
  level: number;                    // ลำดับการอนุมัติ (1, 2, 3...)
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  actionAt?: Date;
  approver?: User;
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
  [Role.ADMIN]: 'ผู้บริหารสูงสุด',
  [Role.CUSTOMER_SERVICE]: 'ฝ่ายบริการลูกค้า',
  [Role.FINANCE_LEADER]: 'หัวหน้าฝ่ายการเงิน',
  [Role.FINANCE]: 'เจ้าหน้าที่การเงิน',
  [Role.SALES_LEADER]: 'หัวหน้าฝ่ายขาย',
  [Role.SALES]: 'พนักงานขาย',
  [Role.HEAD_TECH]: 'หัวหน้าแผนกช่าง',
  [Role.LEADER]: 'หัวหน้าทีม',
  [Role.TECH]: 'ช่าง',
};

export const SubUnitTypeLabels: Record<SubUnitType, string> = {
  [SubUnitType.RENTAL]: 'ทีมเครื่องเช่า',
  [SubUnitType.INSTALLATION]: 'ทีมติดตั้ง',
  [SubUnitType.PRINTER]: 'ทีมปริ้นเตอร์',
  [SubUnitType.IT]: 'ทีมไอที',
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
