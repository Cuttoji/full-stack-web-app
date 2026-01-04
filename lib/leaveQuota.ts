// Leave Quota Management Utilities
import { 
  LeaveType, 
  LeaveDurationType, 
  HalfDayPeriod,
  LEAVE_TYPE_CONFIGS, 
  UserLeaveQuota, 
  UserLeaveBalance,
  Leave,
  LeaveStatus,
} from './types';

/**
 * คำนวณโควตาลาพักร้อนจากอายุงาน
 * สูตร: เดือนที่ทำงาน / 2 (สูงสุด 6 วัน)
 */
export function calculateVacationQuota(employmentStartDate: Date, currentDate: Date = new Date()): number {
  const monthsEmployed = Math.floor(
    (currentDate.getTime() - employmentStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const quota = Math.floor(monthsEmployed / 2);
  return Math.min(quota, 6); // สูงสุด 6 วัน
}

/**
 * ตรวจสอบว่าสามารถลาเดือนเกิดได้หรือไม่
 */
export function canTakeBirthdayLeave(birthMonth: number | undefined, leaveDate: Date): boolean {
  if (!birthMonth) return false;
  return leaveDate.getMonth() + 1 === birthMonth;
}

/**
 * ตรวจสอบว่าประเภทการลาสามารถใช้ duration type ที่ระบุได้หรือไม่
 */
export function isValidDurationType(leaveType: LeaveType, durationType: LeaveDurationType): boolean {
  const config = LEAVE_TYPE_CONFIGS[leaveType];
  return config.allowedDurationTypes.includes(durationType);
}

/**
 * คำนวณจำนวนวันลาจาก duration type
 */
export function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  durationType: LeaveDurationType,
  startTime?: string,
  endTime?: string
): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  switch (durationType) {
    case LeaveDurationType.FULL_DAY:
      return diffDays;
    case LeaveDurationType.HALF_DAY:
      return diffDays * 0.5;
    case LeaveDurationType.TIME_BASED:
      // คำนวณจากชั่วโมง (1 วัน = 8 ชั่วโมง)
      if (startTime && endTime) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        const hours = totalMinutes / 60;
        return Math.round((hours / 8) * 100) / 100; // แปลงเป็นวัน (8 ชม. = 1 วัน)
      }
      return diffDays;
    default:
      return diffDays;
  }
}

/**
 * คำนวณโควตาทั้งหมดของแต่ละประเภทการลา
 */
export function calculateUserQuota(
  leaveType: LeaveType,
  employmentStartDate?: Date,
  currentDate: Date = new Date()
): number {
  const config = LEAVE_TYPE_CONFIGS[leaveType];

  if (config.calculatedByMonthsEmployed && employmentStartDate) {
    return calculateVacationQuota(employmentStartDate, currentDate);
  }

  return config.quotaPerYear;
}

/**
 * คำนวณยอดการลาที่ใช้ไปในปีปัจจุบัน
 */
export function calculateUsedLeave(
  leaves: Leave[],
  leaveType: LeaveType,
  year: number
): { used: number; pending: number } {
  const yearLeaves = leaves.filter((leave) => {
    const leaveYear = new Date(leave.startDate).getFullYear();
    return leave.type === leaveType && leaveYear === year;
  });

  const used = yearLeaves
    .filter((l) => l.status === LeaveStatus.APPROVED)
    .reduce((sum, l) => sum + (l.totalDays || 0), 0);

  const pending = yearLeaves
    .filter((l) => l.status === LeaveStatus.PENDING)
    .reduce((sum, l) => sum + (l.totalDays || 0), 0);

  return { used, pending };
}

/**
 * สร้างข้อมูลยอดคงเหลือการลาของผู้ใช้
 */
export function getUserLeaveBalance(
  userId: string,
  leaves: Leave[],
  employmentStartDate?: Date,
  birthMonth?: number,
  year: number = new Date().getFullYear()
): UserLeaveBalance {
  const quotas: UserLeaveQuota[] = Object.values(LeaveType).map((type) => {
    const totalQuota = calculateUserQuota(type as LeaveType, employmentStartDate);
    const { used, pending } = calculateUsedLeave(leaves, type as LeaveType, year);

    return {
      type: type as LeaveType,
      totalQuota,
      used,
      remaining: Math.max(0, totalQuota - used - pending),
      pending,
    };
  });

  return {
    userId,
    year,
    employmentStartDate,
    birthMonth,
    quotas,
  };
}

/**
 * ตรวจสอบว่าสามารถลาได้หรือไม่
 */
export interface LeaveValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateLeaveRequest(
  leaveType: LeaveType,
  startDate: Date,
  endDate: Date,
  totalDays: number,
  durationType: LeaveDurationType,
  userLeaveBalance: UserLeaveBalance,
  _halfDayPeriod?: HalfDayPeriod
): LeaveValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config = LEAVE_TYPE_CONFIGS[leaveType];
  const quota = userLeaveBalance.quotas.find((q) => q.type === leaveType);

  // 1. ตรวจสอบประเภทการลา (เต็มวัน/ครึ่งวัน/ตามเวลา)
  if (!isValidDurationType(leaveType, durationType)) {
    const allowedTypes = config.allowedDurationTypes.map((t) => {
      switch (t) {
        case LeaveDurationType.FULL_DAY: return 'เต็มวัน';
        case LeaveDurationType.HALF_DAY: return 'ครึ่งวัน';
        case LeaveDurationType.TIME_BASED: return 'ตามเวลา';
      }
    }).join(', ');
    errors.push(`${config.label}สามารถลาได้แบบ ${allowedTypes} เท่านั้น`);
  }

  // 2. ตรวจสอบโควตาคงเหลือ
  if (quota && totalDays > quota.remaining) {
    errors.push(`โควตา${config.label}ไม่เพียงพอ (คงเหลือ ${quota.remaining} วัน, ขอลา ${totalDays} วัน)`);
  }

  // 3. ตรวจสอบจำนวนวันลาติดต่อกัน
  if (config.maxConsecutiveDays && totalDays > config.maxConsecutiveDays) {
    errors.push(`${config.label}สามารถลาติดต่อกันได้สูงสุด ${config.maxConsecutiveDays} วัน`);
  }

  // 4. ตรวจสอบการลาเดือนเกิด
  if (config.isBirthdayMonth) {
    const birthMonth = userLeaveBalance.birthMonth;
    if (!canTakeBirthdayLeave(birthMonth, startDate)) {
      const monthName = birthMonth ? getThaiMonthName(birthMonth) : 'ไม่ทราบ';
      errors.push(`ลาเดือนเกิดได้เฉพาะในเดือน${monthName}เท่านั้น`);
    }
  }

  // 5. ตรวจสอบการลาล่วงหน้า
  if (config.minDaysNotice) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaveStart = new Date(startDate);
    leaveStart.setHours(0, 0, 0, 0);
    const daysNotice = Math.ceil((leaveStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysNotice < config.minDaysNotice) {
      warnings.push(`${config.label}ควรแจ้งล่วงหน้าอย่างน้อย ${config.minDaysNotice} วัน`);
    }
  }

  // 6. ตรวจสอบเอกสารแนบ
  if (config.requiresDocumentation) {
    warnings.push(`${config.label}อาจต้องแนบเอกสารประกอบ`);
  }

  // 7. ลาป่วยเกิน 3 วันต้องมีใบรับรองแพทย์
  if (leaveType === LeaveType.SICK && totalDays > 3) {
    warnings.push('ลาป่วยเกิน 3 วัน ต้องแนบใบรับรองแพทย์');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * ชื่อเดือนภาษาไทย
 */
function getThaiMonthName(month: number): string {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return months[month - 1] || '';
}

/**
 * สรุปข้อมูลโควตาแต่ละประเภทสำหรับแสดงผล
 */
export interface LeaveQuotaSummary {
  type: LeaveType;
  label: string;
  quota: number;
  used: number;
  pending: number;
  remaining: number;
  allowedDurationTypes: string[];
  note?: string;
}

export function getLeaveQuotaSummary(balance: UserLeaveBalance): LeaveQuotaSummary[] {
  return balance.quotas.map((quota) => {
    const config = LEAVE_TYPE_CONFIGS[quota.type];
    let note: string | undefined;

    if (config.calculatedByMonthsEmployed && balance.employmentStartDate) {
      const monthsEmployed = Math.floor(
        (new Date().getTime() - balance.employmentStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      note = `คำนวณจากอายุงาน ${monthsEmployed} เดือน (เดือน/2)`;
    }

    if (config.isBirthdayMonth && balance.birthMonth) {
      note = `ลาได้เฉพาะเดือน${getThaiMonthName(balance.birthMonth)}`;
    }

    return {
      type: quota.type,
      label: config.label,
      quota: quota.totalQuota,
      used: quota.used,
      pending: quota.pending,
      remaining: quota.remaining,
      allowedDurationTypes: config.allowedDurationTypes.map((t) => {
        switch (t) {
          case LeaveDurationType.FULL_DAY: return 'เต็มวัน';
          case LeaveDurationType.HALF_DAY: return 'ครึ่งวัน';
          case LeaveDurationType.TIME_BASED: return 'ตามเวลา';
        }
      }),
      note,
    };
  });
}
