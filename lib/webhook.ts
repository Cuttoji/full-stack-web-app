/**
 * Webhook Service
 * ส่งแจ้งเตือนผ่าน webhook ไปยัง Power Automate, LINE, หรือ service อื่นๆ
 */

// Webhook URLs from environment
const WEBHOOK_LEAVE_URL = process.env.WEBHOOK_LEAVE_URL || process.env.POWER_AUTOMATE_LEAVE_URL;
const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

interface WebhookResult {
  success: boolean;
  error?: string;
}

// ประเภทข้อมูลที่ส่งไป webhook
export interface LeaveWebhookPayload {
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
  // LINE specific
  lineUserId?: string;
}

export interface TaskWebhookPayload {
  type: 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'TASK_CANCELLED' | 'TASK_REMINDER';
  taskId: string;
  taskTitle: string;
  assigneeName?: string;
  assignerName?: string;
  completedByName?: string;
  cancelledByName?: string;
  dueDate?: string;
  appUrl: string;
  lineUserId?: string;
}

export interface GeneralWebhookPayload {
  type: 'GENERAL' | 'SYSTEM_ANNOUNCEMENT';
  title: string;
  message: string;
  link?: string;
  appUrl: string;
  lineUserId?: string;
}

type WebhookPayload = LeaveWebhookPayload | TaskWebhookPayload | GeneralWebhookPayload;

/**
 * ส่งข้อมูลไปยัง webhook URL
 */
async function sendToWebhook(url: string, payload: WebhookPayload): Promise<WebhookResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with ${response.status}`);
    }

    console.log('Webhook triggered successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to trigger webhook:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * ส่งข้อความผ่าน LINE Notify (ง่ายที่สุด)
 * ต้องมี LINE_NOTIFY_TOKEN
 */
async function sendLineNotify(message: string): Promise<WebhookResult> {
  if (!LINE_NOTIFY_TOKEN) {
    return { success: false, error: 'LINE_NOTIFY_TOKEN not configured' };
  }

  try {
    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`,
      },
      body: `message=${encodeURIComponent(message)}`,
    });

    if (!response.ok) {
      throw new Error(`LINE Notify responded with ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send LINE Notify:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * ส่งข้อความผ่าน LINE Messaging API (Push Message)
 * ต้องมี LINE_CHANNEL_ACCESS_TOKEN และ lineUserId
 */
async function sendLinePushMessage(lineUserId: string, message: string): Promise<WebhookResult> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: 'text',
            text: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`LINE API: ${errorData.message || response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send LINE push message:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * ส่ง Flex Message ผ่าน LINE (สวยกว่า)
 */
async function sendLineFlexMessage(lineUserId: string, flexContent: object): Promise<WebhookResult> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: 'flex',
            altText: 'การแจ้งเตือนจากระบบ',
            contents: flexContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`LINE API: ${errorData.message || response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send LINE flex message:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * สร้าง LINE Flex Message สำหรับการลา
 */
function createLeaveFlexMessage(payload: LeaveWebhookPayload): object {
  const isRequest = payload.type === 'LEAVE_REQUEST';
  const isApproved = payload.type === 'LEAVE_APPROVED';
  
  const statusColor = isRequest ? '#1DB446' : isApproved ? '#1DB446' : '#DD0000';
  const statusText = isRequest ? '📋 คำขอลาใหม่' : isApproved ? '✅ อนุมัติแล้ว' : '❌ ไม่อนุมัติ';

  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: statusText,
          weight: 'bold',
          size: 'lg',
          color: '#FFFFFF',
        },
      ],
      backgroundColor: statusColor,
      paddingAll: '15px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: 'ผู้ขอลา', size: 'sm', color: '#999999', flex: 2 },
            { type: 'text', text: payload.requesterName, size: 'sm', flex: 3 },
          ],
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: 'ประเภท', size: 'sm', color: '#999999', flex: 2 },
            { type: 'text', text: payload.leaveType, size: 'sm', flex: 3 },
          ],
          margin: 'md',
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: 'วันที่', size: 'sm', color: '#999999', flex: 2 },
            { type: 'text', text: `${payload.startDate} - ${payload.endDate}`, size: 'sm', flex: 3 },
          ],
          margin: 'md',
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: 'จำนวน', size: 'sm', color: '#999999', flex: 2 },
            { type: 'text', text: `${payload.totalDays} วัน`, size: 'sm', flex: 3 },
          ],
          margin: 'md',
        },
        ...(payload.reason ? [{
          type: 'box' as const,
          layout: 'horizontal' as const,
          contents: [
            { type: 'text' as const, text: 'เหตุผล', size: 'sm' as const, color: '#999999', flex: 2 },
            { type: 'text' as const, text: payload.reason, size: 'sm' as const, flex: 3, wrap: true },
          ],
          margin: 'md' as const,
        }] : []),
        ...(payload.rejectedReason ? [{
          type: 'box' as const,
          layout: 'horizontal' as const,
          contents: [
            { type: 'text' as const, text: 'เหตุผลปฏิเสธ', size: 'sm' as const, color: '#DD0000', flex: 2 },
            { type: 'text' as const, text: payload.rejectedReason, size: 'sm' as const, flex: 3, wrap: true },
          ],
          margin: 'md' as const,
        }] : []),
      ],
      paddingAll: '15px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'ดูรายละเอียด',
            uri: `${payload.appUrl}/leaves`,
          },
          style: 'primary',
          color: statusColor,
        },
      ],
      paddingAll: '15px',
    },
  };
}

/**
 * ส่งแจ้งเตือนการลา - รองรับทุก platform
 */
export async function notifyLeaveViaWebhook(payload: LeaveWebhookPayload): Promise<WebhookResult[]> {
  const results: WebhookResult[] = [];
  const appUrl = payload.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  payload.appUrl = appUrl;

  // 1. ส่งไป Webhook URL (Power Automate, Make, Zapier, etc.)
  if (WEBHOOK_LEAVE_URL) {
    const result = await sendToWebhook(WEBHOOK_LEAVE_URL, payload);
    results.push(result);
  }

  // 2. ส่งผ่าน LINE Notify (Group notification)
  if (LINE_NOTIFY_TOKEN) {
    const statusEmoji = payload.type === 'LEAVE_REQUEST' ? '📋' : 
                        payload.type === 'LEAVE_APPROVED' ? '✅' : '❌';
    const statusText = payload.type === 'LEAVE_REQUEST' ? 'คำขอลาใหม่' : 
                       payload.type === 'LEAVE_APPROVED' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ';
    
    const message = `
${statusEmoji} ${statusText}
👤 ${payload.requesterName}
📌 ${payload.leaveType}
📅 ${payload.startDate} - ${payload.endDate}
⏱️ ${payload.totalDays} วัน
${payload.reason ? `💬 ${payload.reason}` : ''}
${payload.rejectedReason ? `❌ เหตุผล: ${payload.rejectedReason}` : ''}
🔗 ${appUrl}/leaves`;

    const result = await sendLineNotify(message);
    results.push(result);
  }

  // 3. ส่งผ่าน LINE Messaging API (ถ้ามี lineUserId)
  if (LINE_CHANNEL_ACCESS_TOKEN && payload.lineUserId) {
    const flexMessage = createLeaveFlexMessage(payload);
    const result = await sendLineFlexMessage(payload.lineUserId, flexMessage);
    results.push(result);
  }

  return results;
}

/**
 * ส่งแจ้งเตือนการขอลาไปยังผู้อนุมัติ
 */
export async function notifyLeaveRequestViaWebhook(
  requesterName: string,
  requesterEmail: string,
  approverName: string,
  approverEmail: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  totalDays: number,
  reason?: string,
  lineUserId?: string
): Promise<WebhookResult[]> {
  return notifyLeaveViaWebhook({
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
    lineUserId,
  });
}

/**
 * ส่งแจ้งเตือนผลการอนุมัติการลา
 */
export async function notifyLeaveApprovalViaWebhook(
  requesterName: string,
  requesterEmail: string,
  approverName: string,
  approverEmail: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  totalDays: number,
  approved: boolean,
  rejectedReason?: string,
  lineUserId?: string
): Promise<WebhookResult[]> {
  return notifyLeaveViaWebhook({
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
    lineUserId,
  });
}

/**
 * ส่งแจ้งเตือนงานผ่าน webhook
 */
export async function notifyTaskViaWebhook(payload: TaskWebhookPayload): Promise<WebhookResult[]> {
  const results: WebhookResult[] = [];
  const appUrl = payload.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  payload.appUrl = appUrl;

  // 1. ส่งไป Webhook URL
  const taskWebhookUrl = process.env.WEBHOOK_TASK_URL;
  if (taskWebhookUrl) {
    const result = await sendToWebhook(taskWebhookUrl, payload);
    results.push(result);
  }

  // 2. ส่งผ่าน LINE Notify
  if (LINE_NOTIFY_TOKEN) {
    let message = '';
    switch (payload.type) {
      case 'TASK_ASSIGNED':
        message = `📋 งานใหม่: ${payload.taskTitle}\n👤 มอบหมายโดย: ${payload.assignerName}\n🔗 ${appUrl}/tasks/${payload.taskId}`;
        break;
      case 'TASK_COMPLETED':
        message = `✅ งานเสร็จ: ${payload.taskTitle}\n👤 โดย: ${payload.completedByName}\n🔗 ${appUrl}/tasks/${payload.taskId}`;
        break;
      case 'TASK_CANCELLED':
        message = `❌ ยกเลิกงาน: ${payload.taskTitle}\n👤 โดย: ${payload.cancelledByName}\n🔗 ${appUrl}/tasks/${payload.taskId}`;
        break;
      case 'TASK_REMINDER':
        message = `⏰ เตือน: ${payload.taskTitle}\n📅 กำหนด: ${payload.dueDate}\n🔗 ${appUrl}/tasks/${payload.taskId}`;
        break;
    }
    const result = await sendLineNotify(message);
    results.push(result);
  }

  return results;
}

// Export LINE functions for direct use
export { sendLineNotify, sendLinePushMessage, sendLineFlexMessage };
