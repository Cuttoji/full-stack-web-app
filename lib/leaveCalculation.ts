/**
 * Leave Calculation Utilities
 * คำนวณนาทีที่ใช้จริงสำหรับการลา โดยหักวันหยุดและพักเที่ยง
 */

// Constants
export const WORK_MINUTES_PER_DAY = 480; // 8 ชั่วโมง = 480 นาที
export const LUNCH_START_HOUR = 12;
export const LUNCH_END_HOUR = 13;
export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 17;
export const MIN_LEAVE_MINUTES = 30;

/**
 * ตรวจสอบว่าวันนั้นเป็นวันหยุดสุดสัปดาห์หรือไม่
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * นับจำนวนวันทำงาน (จันทร์-ศุกร์) ระหว่างช่วงวันที่
 */
export function countWorkDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  while (current <= end) {
    if (!isWeekend(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * คำนวณนาทีที่ทับซ้อนกับช่วงพักเที่ยง (12:00-13:00)
 */
export function calculateLunchOverlap(
  startHour: number, 
  startMinute: number, 
  endHour: number, 
  endMinute: number
): number {
  // แปลงเป็นนาทีจาก 00:00
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  const lunchStartMinutes = LUNCH_START_HOUR * 60; // 12:00 = 720
  const lunchEndMinutes = LUNCH_END_HOUR * 60;     // 13:00 = 780
  
  // หาช่วงที่ทับซ้อน
  const overlapStart = Math.max(startTotalMinutes, lunchStartMinutes);
  const overlapEnd = Math.min(endTotalMinutes, lunchEndMinutes);
  
  if (overlapStart < overlapEnd) {
    return overlapEnd - overlapStart;
  }
  
  return 0;
}

/**
 * คำนวณนาทีที่ใช้จริงสำหรับการลา
 * 
 * @param startDate - วันที่เริ่มลา
 * @param endDate - วันที่สิ้นสุดลา
 * @param isFullDay - true = ลาเต็มวัน, false = ลาตามเวลา
 * @param startTime - เวลาเริ่ม (สำหรับ TIME_BASED) format "HH:mm"
 * @param endTime - เวลาสิ้นสุด (สำหรับ TIME_BASED) format "HH:mm"
 * @returns จำนวนนาทีที่ใช้จริง (หักพักเที่ยงและวันหยุดแล้ว)
 */
export function calculateLeaveMinutes(
  startDate: Date | string,
  endDate: Date | string,
  isFullDay: boolean,
  startTime?: string,
  endTime?: string
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  if (isFullDay) {
    // กรณีเต็มวัน: นับเฉพาะวันจันทร์-ศุกร์ (วันละ 480 นาที)
    const workDays = countWorkDays(start, end);
    return workDays * WORK_MINUTES_PER_DAY;
  }
  
  // กรณีตามเวลา (TIME_BASED)
  if (!startTime || !endTime) {
    return 0;
  }
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // คำนวณนาทีทั้งหมด
  const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  
  if (totalMinutes <= 0) {
    return 0;
  }
  
  // หักช่วงพักเที่ยง
  const lunchOverlap = calculateLunchOverlap(startHour, startMinute, endHour, endMinute);
  const actualMinutes = totalMinutes - lunchOverlap;
  
  return Math.max(actualMinutes, 0);
}

/**
 * แปลงนาทีเป็นชั่วโมงและนาที
 */
export function minutesToHoursMinutes(minutes: number): { hours: number; minutes: number } {
  return {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
  };
}

/**
 * แปลงนาทีเป็นวัน (ใช้สำหรับคำนวณโควต้า)
 */
export function minutesToDays(minutes: number): number {
  return minutes / WORK_MINUTES_PER_DAY;
}

/**
 * แปลงวันเป็นนาที
 */
export function daysToMinutes(days: number): number {
  return days * WORK_MINUTES_PER_DAY;
}

/**
 * Format นาทีเป็น string แสดงผล
 */
export function formatMinutesToDisplay(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 นาที';
  
  const { hours, minutes } = minutesToHoursMinutes(totalMinutes);
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (minutes > 0) parts.push(`${minutes} นาที`);
  
  return parts.join(' ');
}

/**
 * Format นาทีเป็นวัน/ชั่วโมง/นาที
 */
export function formatMinutesToFullDisplay(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 นาที';
  
  const days = Math.floor(totalMinutes / WORK_MINUTES_PER_DAY);
  const remainingMinutes = totalMinutes % WORK_MINUTES_PER_DAY;
  const { hours, minutes } = minutesToHoursMinutes(remainingMinutes);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (minutes > 0) parts.push(`${minutes} นาที`);
  
  return parts.join(' ') || '0 นาที';
}

/**
 * สร้าง options สำหรับ dropdown เวลา
 * เริ่มจาก 08:00 - 17:30 ทุก 15 นาที
 * สำหรับ End Time จะ filter ให้เลือกเฉพาะเวลาที่ห่างจาก Start Time อย่างน้อย 30 นาที
 */
export function generateTimeOptions(
  minTime?: string
): { value: string; label: string; disabled?: boolean }[] {
  const options: { value: string; label: string; disabled?: boolean }[] = [];
  
  // แปลง minTime เป็นนาที (บวก 30 นาทีขั้นต่ำสำหรับ End Time)
  let minMinutes = 0;
  if (minTime) {
    const [h, m] = minTime.split(':').map(Number);
    minMinutes = h * 60 + m + MIN_LEAVE_MINUTES; // บวก 30 นาทีขั้นต่ำ
  }
  
  // Loop ทุก 15 นาที
  for (let hour = WORK_START_HOUR; hour <= WORK_END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      // ไม่เกิน 17:30
      if (hour === WORK_END_HOUR && minute > 30) continue;
      
      const totalMinutes = hour * 60 + minute;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // ตรวจสอบว่าน้อยกว่า minTime + 30 นาทีหรือไม่ (สำหรับ End Time dropdown)
      const isTooEarly = minTime ? totalMinutes < minMinutes : false;
      
      options.push({
        value: timeStr,
        label: timeStr,
        disabled: isTooEarly,
      });
    }
  }
  
  return options;
}

/**
 * Validate เวลาลา
 */
export function validateLeaveTime(
  startTime: string,
  endTime: string
): { valid: boolean; error?: string } {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  // ตรวจสอบเวลาเริ่มไม่เกินเวลาสิ้นสุด
  if (startTotalMinutes >= endTotalMinutes) {
    return { valid: false, error: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม' };
  }
  
  // คำนวณระยะเวลาจริง (หักพักเที่ยง)
  const actualMinutes = calculateLeaveMinutes(
    new Date(),
    new Date(),
    false,
    startTime,
    endTime
  );
  
  // ตรวจสอบขั้นต่ำ 30 นาที
  if (actualMinutes < MIN_LEAVE_MINUTES) {
    return { valid: false, error: `ระยะเวลาการลาขั้นต่ำคือ ${MIN_LEAVE_MINUTES} นาที (หลังหักพักเที่ยง)` };
  }
  
  return { valid: true };
}
