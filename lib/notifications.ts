/**
 * Notification Service
 * บริการจัดการการแจ้งเตือนแบบรวมศูนย์
 */

import prisma from './prisma';

// ประเภทการแจ้งเตือน
export enum NotificationType {
  // Task
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_CANCELLED = 'TASK_CANCELLED',
  TASK_REMINDER = 'TASK_REMINDER',
  TASK_OVERDUE = 'TASK_OVERDUE',
  
  // Leave
  LEAVE_REQUEST = 'LEAVE_REQUEST',
  LEAVE_APPROVED = 'LEAVE_APPROVED',
  LEAVE_REJECTED = 'LEAVE_REJECTED',
  LEAVE_REMINDER = 'LEAVE_REMINDER',
  
  // Conflict
  CAR_CONFLICT = 'CAR_CONFLICT',
  
  // System
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  WELCOME = 'WELCOME',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // General
  GENERAL = 'GENERAL',
}

// Priority ของ notification
export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// Interface สำหรับสร้าง notification
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
}

// Interface สำหรับสร้าง notification หลายอัน
export interface CreateBulkNotificationInput {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
}

// ผลลัพธ์จากการสร้าง notification
export interface NotificationResult {
  success: boolean;
  count?: number;
  error?: string;
}

/**
 * สร้าง notification ให้ user คนเดียว
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationResult> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        data: input.data ? {
          ...input.data,
          priority: input.priority || NotificationPriority.NORMAL,
        } : { priority: input.priority || NotificationPriority.NORMAL },
      },
    });
    return { success: true, count: 1 };
  } catch (error) {
    console.error('Failed to create notification:', error);
    return { success: false, error: 'Failed to create notification' };
  }
}

/**
 * สร้าง notification ให้หลาย users พร้อมกัน
 */
export async function createBulkNotifications(
  input: CreateBulkNotificationInput
): Promise<NotificationResult> {
  try {
    if (input.userIds.length === 0) {
      return { success: true, count: 0 };
    }

    const result = await prisma.notification.createMany({
      data: input.userIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        data: input.data ? {
          ...input.data,
          priority: input.priority || NotificationPriority.NORMAL,
        } : { priority: input.priority || NotificationPriority.NORMAL },
      })),
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error('Failed to create bulk notifications:', error);
    return { success: false, error: 'Failed to create notifications' };
  }
}

/**
 * ส่ง notification เมื่อมอบหมายงาน
 */
export async function notifyTaskAssignment(
  taskId: string,
  taskTitle: string,
  assigneeIds: string[],
  assignerName: string
): Promise<NotificationResult> {
  return createBulkNotifications({
    userIds: assigneeIds,
    type: NotificationType.TASK_ASSIGNED,
    title: 'ได้รับมอบหมายงานใหม่',
    message: `${assignerName} มอบหมายงาน "${taskTitle}" ให้คุณ`,
    link: `/tasks/${taskId}`,
    data: { taskId, assignerName },
    priority: NotificationPriority.HIGH,
  });
}

/**
 * ส่ง notification เมื่องานเสร็จ
 */
export async function notifyTaskCompleted(
  taskId: string,
  taskTitle: string,
  creatorId: string,
  completedByName: string
): Promise<NotificationResult> {
  return createNotification({
    userId: creatorId,
    type: NotificationType.TASK_COMPLETED,
    title: 'งานเสร็จสมบูรณ์',
    message: `งาน "${taskTitle}" เสร็จสมบูรณ์โดย ${completedByName}`,
    link: `/tasks/${taskId}`,
    data: { taskId, completedByName },
    priority: NotificationPriority.NORMAL,
  });
}

/**
 * ส่ง notification เมื่อยกเลิกงาน
 */
export async function notifyTaskCancelled(
  taskId: string,
  taskTitle: string,
  assigneeIds: string[],
  cancelledByName: string,
  reason?: string
): Promise<NotificationResult> {
  return createBulkNotifications({
    userIds: assigneeIds,
    type: NotificationType.TASK_CANCELLED,
    title: 'งานถูกยกเลิก',
    message: `งาน "${taskTitle}" ถูกยกเลิกโดย ${cancelledByName}${reason ? `: ${reason}` : ''}`,
    link: `/tasks/${taskId}`,
    data: { taskId, cancelledByName, reason },
    priority: NotificationPriority.HIGH,
  });
}

/**
 * ส่ง notification เมื่องานใกล้ถึงกำหนด
 */
export async function notifyTaskReminder(
  taskId: string,
  taskTitle: string,
  assigneeIds: string[],
  dueDate: Date
): Promise<NotificationResult> {
  const formattedDate = dueDate.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
  });
  
  return createBulkNotifications({
    userIds: assigneeIds,
    type: NotificationType.TASK_REMINDER,
    title: 'เตือนความจำงาน',
    message: `งาน "${taskTitle}" มีกำหนดส่ง ${formattedDate}`,
    link: `/tasks/${taskId}`,
    data: { taskId, dueDate: dueDate.toISOString() },
    priority: NotificationPriority.HIGH,
  });
}

/**
 * ส่ง notification เมื่องานเลยกำหนด
 */
export async function notifyTaskOverdue(
  taskId: string,
  taskTitle: string,
  assigneeIds: string[]
): Promise<NotificationResult> {
  return createBulkNotifications({
    userIds: assigneeIds,
    type: NotificationType.TASK_OVERDUE,
    title: 'งานเลยกำหนด!',
    message: `งาน "${taskTitle}" เลยกำหนดส่งแล้ว กรุณาดำเนินการโดยเร็ว`,
    link: `/tasks/${taskId}`,
    data: { taskId },
    priority: NotificationPriority.URGENT,
  });
}

/**
 * ส่ง notification เมื่อมีการขอลา
 */
export async function notifyLeaveRequest(
  leaveId: string,
  requesterName: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  approverIds: string[]
): Promise<NotificationResult> {
  const dateRange = startDate.toISOString() === endDate.toISOString()
    ? startDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    : `${startDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;

  return createBulkNotifications({
    userIds: approverIds,
    type: NotificationType.LEAVE_REQUEST,
    title: 'คำขอลาใหม่',
    message: `${requesterName} ขอ${leaveType} วันที่ ${dateRange}`,
    link: `/leaves?id=${leaveId}`,
    data: { leaveId, requesterName, leaveType },
    priority: NotificationPriority.NORMAL,
  });
}

/**
 * ส่ง notification เมื่อการลาได้รับการอนุมัติ
 */
export async function notifyLeaveApproved(
  leaveId: string,
  userId: string,
  approverName: string
): Promise<NotificationResult> {
  return createNotification({
    userId,
    type: NotificationType.LEAVE_APPROVED,
    title: 'การลาได้รับอนุมัติ ✓',
    message: `คำขอลาของคุณได้รับการอนุมัติโดย ${approverName}`,
    link: `/leaves`,
    data: { leaveId, approverName },
    priority: NotificationPriority.NORMAL,
  });
}

/**
 * ส่ง notification เมื่อการลาถูกปฏิเสธ
 */
export async function notifyLeaveRejected(
  leaveId: string,
  userId: string,
  approverName: string,
  reason?: string
): Promise<NotificationResult> {
  return createNotification({
    userId,
    type: NotificationType.LEAVE_REJECTED,
    title: 'การลาถูกปฏิเสธ',
    message: `คำขอลาของคุณถูกปฏิเสธโดย ${approverName}${reason ? `: ${reason}` : ''}`,
    link: `/leaves`,
    data: { leaveId, approverName, reason },
    priority: NotificationPriority.HIGH,
  });
}

/**
 * ส่ง notification เมื่อพบรถถูกจองซ้ำ
 */
export async function notifyCarConflict(
  userId: string,
  message: string,
  link?: string
): Promise<NotificationResult> {
  return createNotification({
    userId,
    type: NotificationType.CAR_CONFLICT,
    title: 'แจ้งเตือน: รถถูกจองซ้ำ',
    message,
    link,
    priority: NotificationPriority.HIGH,
  });
}

/**
 * ส่ง notification ประกาศทั้งระบบ
 */
export async function notifySystemAnnouncement(
  title: string,
  message: string,
  excludeUserIds?: string[]
): Promise<NotificationResult> {
  try {
    // ดึง user ทั้งหมดที่ active
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(excludeUserIds && excludeUserIds.length > 0 && {
          id: { notIn: excludeUserIds },
        }),
      },
      select: { id: true },
    });

    return createBulkNotifications({
      userIds: users.map((u) => u.id),
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title,
      message,
      priority: NotificationPriority.NORMAL,
    });
  } catch (error) {
    console.error('Failed to send system announcement:', error);
    return { success: false, error: 'Failed to send system announcement' };
  }
}

/**
 * ส่ง notification ต้อนรับ user ใหม่
 */
export async function notifyWelcome(userId: string, userName: string): Promise<NotificationResult> {
  return createNotification({
    userId,
    type: NotificationType.WELCOME,
    title: 'ยินดีต้อนรับ! 🎉',
    message: `สวัสดี ${userName}! ยินดีต้อนรับเข้าสู่ระบบ Task Management`,
    link: '/dashboard',
    priority: NotificationPriority.LOW,
  });
}

/**
 * ลบ notification เก่า (เกิน 30 วัน)
 */
export async function cleanupOldNotifications(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: thirtyDaysAgo },
      isRead: true,
    },
  });

  return result.count;
}

/**
 * ดึงจำนวน unread notifications
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}
