/**
 * Recurring Tasks Scheduler
 * 
 * สร้าง tasks ที่วนซ้ำอัตโนมัติตาม pattern ที่กำหนด
 * ควรเรียกใช้ผ่าน cron job หรือ scheduled function ทุกวัน
 */

import prisma from './prisma';
import { generateJobNumber } from './utils';
import { TaskStatus } from './types';

/**
 * คำนวณวันที่ถัดไปสำหรับ recurring task
 */
function calculateNextDate(
  lastDate: Date,
  pattern: string,
  interval: number = 1
): Date {
  const nextDate = new Date(lastDate);
  
  switch (pattern.toUpperCase()) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      break;
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    default:
      throw new Error(`Unknown loop pattern: ${pattern}`);
  }
  
  return nextDate;
}

/**
 * ตรวจสอบว่าควรสร้าง recurring task หรือไม่
 */
function shouldCreateTask(
  nextDate: Date,
  loopEndDate: Date | null,
  daysAhead: number = 7
): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  // ตรวจสอบว่า nextDate อยู่ในช่วงที่กำหนดและไม่เกิน loopEndDate
  const isWithinRange = nextDate >= today && nextDate <= futureDate;
  const isBeforeEndDate = !loopEndDate || nextDate <= loopEndDate;
  
  return isWithinRange && isBeforeEndDate;
}

/**
 * สร้าง recurring tasks สำหรับช่วงเวลาที่กำหนด
 */
export async function generateRecurringTasks(daysAhead: number = 7): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // ดึง parent tasks ที่เป็น loop และยังไม่หมดอายุ
    const recurringTemplates = await prisma.task.findMany({
      where: {
        isLoop: true,
        parentTaskId: null, // เฉพาะ parent task
        deletedAt: null,
        status: { not: TaskStatus.CANCELLED },
        OR: [
          { loopEndDate: null },
          { loopEndDate: { gte: new Date() } },
        ],
      },
      include: {
        assignments: true,
        childTasks: {
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
    });

    for (const template of recurringTemplates) {
      try {
        if (!template.loopPattern) {
          result.skipped++;
          continue;
        }

        // หาวันที่ของ child task ล่าสุด หรือใช้ startDate ของ parent
        const lastTaskDate = template.childTasks[0]?.startDate || template.startDate;
        
        // คำนวณวันที่ถัดไป
        const nextStartDate = calculateNextDate(
          lastTaskDate,
          template.loopPattern,
          template.loopInterval || 1
        );

        // คำนวณ endDate based on original duration
        const originalDuration = template.endDate.getTime() - template.startDate.getTime();
        const nextEndDate = new Date(nextStartDate.getTime() + originalDuration);

        // ตรวจสอบว่าควรสร้าง task หรือไม่
        if (!shouldCreateTask(nextStartDate, template.loopEndDate, daysAhead)) {
          result.skipped++;
          continue;
        }

        // ตรวจสอบว่ามี task สำหรับวันนี้แล้วหรือไม่
        const existingTask = await prisma.task.findFirst({
          where: {
            parentTaskId: template.id,
            startDate: {
              gte: new Date(nextStartDate.setHours(0, 0, 0, 0)),
              lt: new Date(nextStartDate.setHours(23, 59, 59, 999)),
            },
          },
        });

        if (existingTask) {
          result.skipped++;
          continue;
        }

        // สร้าง child task ใหม่
        const newTask = await prisma.task.create({
          data: {
            jobNumber: generateJobNumber(),
            title: template.title,
            description: template.description,
            location: template.location,
            customerName: template.customerName,
            customerPhone: template.customerPhone,
            startDate: nextStartDate,
            endDate: nextEndDate,
            scheduledDate: nextStartDate,
            startTime: template.startTime,
            endTime: template.endTime,
            status: TaskStatus.WAITING,
            subUnitId: template.subUnitId,
            carId: template.carId,
            createdById: template.createdById,
            parentTaskId: template.id, // Link to parent
            isLoop: false, // Child tasks are not loops themselves
          },
        });

        // Copy assignments from parent task
        if (template.assignments.length > 0) {
          await prisma.taskAssignment.createMany({
            data: template.assignments.map(assignment => ({
              taskId: newTask.id,
              userId: assignment.userId,
              isLead: assignment.isLead,
              isPrimary: assignment.isPrimary,
            })),
          });
        }

        result.created++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to create recurring task for template ${template.id}: ${errorMsg}`);
      }
    }

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Scheduler error: ${errorMsg}`);
    return result;
  }
}

/**
 * ลบ recurring tasks ที่หมดอายุ (soft delete)
 */
export async function cleanupExpiredRecurringTasks(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.task.updateMany({
    where: {
      isLoop: true,
      parentTaskId: null,
      loopEndDate: { lt: today },
      deletedAt: null,
    },
    data: {
      isLoop: false, // Disable looping
    },
  });

  return result.count;
}

/**
 * Get upcoming recurring tasks for preview
 */
export async function getUpcomingRecurringTasks(daysAhead: number = 30): Promise<Array<{
  parentTask: {
    id: string;
    title: string;
    loopPattern: string | null;
    loopInterval: number | null;
  };
  nextDates: Date[];
}>> {
  const recurringTemplates = await prisma.task.findMany({
    where: {
      isLoop: true,
      parentTaskId: null,
      deletedAt: null,
      status: { not: TaskStatus.CANCELLED },
      OR: [
        { loopEndDate: null },
        { loopEndDate: { gte: new Date() } },
      ],
    },
    select: {
      id: true,
      title: true,
      loopPattern: true,
      loopInterval: true,
      loopEndDate: true,
      startDate: true,
      childTasks: {
        orderBy: { startDate: 'desc' },
        take: 1,
        select: { startDate: true },
      },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  return recurringTemplates.map(template => {
    const nextDates: Date[] = [];
    
    if (!template.loopPattern) {
      return { parentTask: template, nextDates };
    }

    let currentDate = template.childTasks[0]?.startDate || template.startDate;
    
    // Generate next dates within range
    for (let i = 0; i < 10; i++) { // Max 10 iterations
      const nextDate = calculateNextDate(
        currentDate,
        template.loopPattern,
        template.loopInterval || 1
      );
      
      if (nextDate > endDate) break;
      if (template.loopEndDate && nextDate > template.loopEndDate) break;
      
      if (nextDate >= today) {
        nextDates.push(nextDate);
      }
      
      currentDate = nextDate;
    }

    return { parentTask: template, nextDates };
  });
}
