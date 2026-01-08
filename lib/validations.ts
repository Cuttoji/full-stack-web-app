import { z } from 'zod';
import { TaskStatus, LeaveStatus, LeaveType, LeaveDurationType, HalfDayPeriod, CarStatus, Role } from './types';

// ==================== Common Schemas ====================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idSchema = z.string().cuid();

export const dateSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'วันที่ไม่ถูกต้อง',
});

export const timeSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: 'รูปแบบเวลาไม่ถูกต้อง (HH:mm)',
});

export const emailSchema = z.string().email('รูปแบบอีเมลไม่ถูกต้อง').toLowerCase();

export const phoneSchema = z.string()
  .transform(val => val === '' ? undefined : val)
  .pipe(
    z.string().regex(/^[0-9]{9,10}$/, {
      message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก',
    }).optional()
  );

// ==================== Auth Schemas ====================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร').max(100),
  email: emailSchema,
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  phone: phoneSchema,
  birthDate: dateSchema.optional(),
  departmentId: z.string().optional(),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
});

// ==================== User Schemas ====================

export const createUserSchema = z.object({
  employeeId: z.string().min(1, 'กรุณากรอกรหัสพนักงาน'),
  email: emailSchema,
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  phone: phoneSchema,
  birthDate: dateSchema.optional(),
  lunchBreakStart: z.enum(['11:30','12:00','12:30']).optional(),
  lunchBreakDuration: z.number().int().min(0).max(180).optional(),
  role: z.nativeEnum(Role),
  departmentId: z.string().optional(),
  subUnitId: z.string().optional(),
  leaveQuota: z.number().int().min(0).max(365).optional(),
  supervisorId: z.string().optional(),
  permissionScope: z.any().optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const getUsersQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  role: z.string().optional(), // comma-separated roles
  departmentId: z.string().optional(),
  subUnitId: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

// ==================== Task Schemas ====================

export const taskStatusSchema = z.nativeEnum(TaskStatus);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่องาน').max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  customerName: z.string().max(200).optional(),
  customerPhone: phoneSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  startTime: timeSchema.optional().default('09:00'),
  endTime: timeSchema.optional().default('17:00'),
  subUnitId: z.string().optional(),
  carId: z.string().optional(),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'วันเริ่มต้นต้องไม่เกินวันสิ้นสุด',
  path: ['endDate'],
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  customerName: z.string().max(200).optional(),
  customerPhone: phoneSchema,
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  status: taskStatusSchema.optional(),
  subUnitId: z.string().nullable().optional(),
  carId: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export const assignTaskSchema = z.object({
  userIds: z.array(z.string()).min(1, 'กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน'),
  carId: z.string().optional(),
});

export const getTasksQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: taskStatusSchema.optional(),
  subUnitId: z.string().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

// ==================== Car Schemas ====================

export const carStatusSchema = z.nativeEnum(CarStatus);

export const createCarSchema = z.object({
  plateNumber: z.string().min(1, 'กรุณากรอกทะเบียนรถ').max(20),
  name: z.string().min(1, 'กรุณากรอกชื่อรถ').max(100),
  type: z.string().max(50).optional(),
  brand: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  description: z.string().max(500).optional(),
});

export const updateCarSchema = createCarSchema.partial().extend({
  status: carStatusSchema.optional(),
  mileage: z.number().int().min(0).optional(),
});

export const getCarsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: carStatusSchema.optional(),
});

// ==================== Leave Schemas ====================

export const leaveTypeSchema = z.nativeEnum(LeaveType);
export const leaveStatusSchema = z.nativeEnum(LeaveStatus);
export const leaveDurationTypeSchema = z.nativeEnum(LeaveDurationType);
export const halfDayPeriodSchema = z.nativeEnum(HalfDayPeriod);

export const createLeaveSchema = z.object({
  type: leaveTypeSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  reason: z.string().max(1000).optional(),
  durationType: leaveDurationTypeSchema.optional().default(LeaveDurationType.FULL_DAY),
  halfDayPeriod: halfDayPeriodSchema.optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  totalDays: z.number().min(0).optional(),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'วันเริ่มต้นต้องไม่เกินวันสิ้นสุด',
  path: ['endDate'],
}).refine((data) => {
  if (data.durationType === LeaveDurationType.HALF_DAY && !data.halfDayPeriod) {
    return false;
  }
  return true;
}, {
  message: 'กรุณาระบุช่วงเวลาสำหรับการลาครึ่งวัน',
  path: ['halfDayPeriod'],
}).refine((data) => {
  if (data.durationType === LeaveDurationType.TIME_BASED && (!data.startTime || !data.endTime)) {
    return false;
  }
  return true;
}, {
  message: 'กรุณาระบุเวลาเริ่มต้นและสิ้นสุด',
  path: ['startTime'],
});

export const updateLeaveSchema = z.object({
  status: leaveStatusSchema.optional(),
  approvalNote: z.string().max(500).optional(),
});

export const getLeavesQuerySchema = paginationSchema.extend({
  status: leaveStatusSchema.optional(),
  userId: z.string().optional(),
  pendingApproval: z.enum(['true', 'false']).optional(),
});

// ==================== Notification Schemas ====================

export const updateNotificationSchema = z.object({
  isRead: z.boolean(),
});

// ==================== Validation Helper ====================

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.issues.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
  
  return { success: false, errors };
}

export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; errors: string[] } {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return validateRequest(schema, params);
}

// ==================== Type Exports ====================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type CreateCarInput = z.infer<typeof createCarSchema>;
export type UpdateCarInput = z.infer<typeof updateCarSchema>;
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type UpdateLeaveInput = z.infer<typeof updateLeaveSchema>;
