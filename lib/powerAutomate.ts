/**
 * Power Automate Integration
 * ส่ง email ผ่าน Power Automate webhook
 */

// Power Automate webhook URL from environment
const POWER_AUTOMATE_LEAVE_URL = process.env.POWER_AUTOMATE_LEAVE_URL;

interface PowerAutomateResult {
  success: boolean;
  error?: string;
}

interface LeaveRequestPayload {
  type: 'LEAVE_REQUEST' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED';
  requesterName: string;
  requesterEmail: string;
  approverName: string;
  approverEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  rejectedReason?: string;
  appUrl: string;
}

/**
 * ส่งข้อมูลไปยัง Power Automate webhook
 */
async function sendToPowerAutomate(payload: LeaveRequestPayload): Promise<PowerAutomateResult> {
  if (!POWER_AUTOMATE_LEAVE_URL) {
    console.warn('POWER_AUTOMATE_LEAVE_URL not configured, skipping Power Automate');
    return { success: false, error: 'Power Automate URL not configured' };
  }

  try {
    const response = await fetch(POWER_AUTOMATE_LEAVE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Power Automate responded with ${response.status}`);
    }

    console.log('Power Automate triggered successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to trigger Power Automate:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * ส่งแจ้งเตือนการขอลาไปยังผู้อนุมัติ
 */
export async function notifyLeaveRequestViaPA(
  requesterName: string,
  requesterEmail: string,
  approverName: string,
  approverEmail: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  totalDays: number,
  reason?: string
): Promise<PowerAutomateResult> {
  return sendToPowerAutomate({
    type: 'LEAVE_REQUEST',
    requesterName,
    requesterEmail,
    approverName,
    approverEmail,
    leaveType,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    totalDays,
    reason,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  });
}

/**
 * ส่งแจ้งเตือนผลการอนุมัติการลา
 */
export async function notifyLeaveApprovalViaPA(
  requesterName: string,
  requesterEmail: string,
  approverName: string,
  approverEmail: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  totalDays: number,
  approved: boolean,
  rejectedReason?: string
): Promise<PowerAutomateResult> {
  return sendToPowerAutomate({
    type: approved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
    requesterName,
    requesterEmail,
    approverName,
    approverEmail,
    leaveType,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    totalDays,
    rejectedReason,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  });
}
