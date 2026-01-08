/**
 * Webhook Service
 * ส่งแจ้งเตือนผ่าน webhook ไปยัง Power Automate, LINE, หรือ service อื่นๆ
 */

// Webhook URLs from environment
const WEBHOOK_LEAVE_URL = process.env.WEBHOOK_LEAVE_URL || process.env.POWER_AUTOMATE_LEAVE_URL;
const POWER_AUTOMATE_URL = process.env.POWER_AUTOMATE_URL || process.env.WEBHOOK_LEAVE_URL || '';
const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

interface WebhookResult {
  success: boolean;
  error?: string;
}

// Azure AD token cache for client-credentials flow
let _azureToken: { accessToken: string; expiresAt: number } | null = null;

async function getAzureAccessToken(): Promise<string> {
  if (_azureToken && Date.now() < _azureToken.expiresAt - 5000) {
    return _azureToken.accessToken;
  }

  const tenant = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const scope = process.env.POWER_AUTOMATE_SCOPE || process.env.AZURE_SCOPE || 'https://management.azure.com/.default';

  if (!tenant || !clientId || !clientSecret) {
    throw new Error('Azure AD credentials not configured (AZURE_TENANT_ID/AZURE_CLIENT_ID/AZURE_CLIENT_SECRET)');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('scope', scope);

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Failed to get Azure access token: ${res.status} ${res.statusText} ${txt}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Azure token response missing access_token');
  }

  const expiresIn = parseInt(data.expires_in || '3600', 10);
  _azureToken = { accessToken: data.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  return _azureToken.accessToken;
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Optional auth headers for Power Automate / APIM / Shared Access
    if (process.env.WEBHOOK_APIM_SUBSCRIPTION_KEY) {
      headers['Ocp-Apim-Subscription-Key'] = process.env.WEBHOOK_APIM_SUBSCRIPTION_KEY;
    }

    if (process.env.WEBHOOK_AUTH_HEADER_NAME && process.env.WEBHOOK_AUTH_HEADER_VALUE) {
      headers[process.env.WEBHOOK_AUTH_HEADER_NAME] = process.env.WEBHOOK_AUTH_HEADER_VALUE;
    }

    if (process.env.WEBHOOK_SHARED_ACCESS) {
      // Some Power Platform flows expect a Shared Access signature in Authorization header
      headers['Authorization'] = `SharedAccessSignature ${process.env.WEBHOOK_SHARED_ACCESS}`;
    }

    // If Azure AD creds configured, get token and set Authorization —
    // but skip if the URL already contains a `sig=` (SAS) or explicit webhook auth is configured.
    const hasSigInUrl = url.includes('sig=');
    const hasExplicitAuthEnv = Boolean(
      process.env.WEBHOOK_SHARED_ACCESS || process.env.WEBHOOK_APIM_SUBSCRIPTION_KEY ||
      (process.env.WEBHOOK_AUTH_HEADER_NAME && process.env.WEBHOOK_AUTH_HEADER_VALUE)
    );

    if (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && !hasSigInUrl && !hasExplicitAuthEnv) {
      try {
        const token = await getAzureAccessToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        console.error('Failed to obtain Azure AD token for webhook:', err);
      }
    } else if (hasSigInUrl) {
      // If sig present in URL, Power Automate expects that and no Authorization header is needed.
      console.log('Webhook URL contains sig=, skipping Azure AD token authentication.');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
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
  const targetWebhookUrl = POWER_AUTOMATE_URL || WEBHOOK_LEAVE_URL || process.env.WEBHOOK_LEAVE_URL || process.env.POWER_AUTOMATE_URL || '';
  if (targetWebhookUrl) {
    // Map to Power Automate expected schema
    const paTitle = payload.type === 'LEAVE_REQUEST' ? 'คำขอลาใหม่' : payload.type === 'LEAVE_APPROVED' ? 'การลาถูกอนุมัติ' : 'การลาถูกปฏิเสธ';
    const paMessage = `${payload.requesterName} - ${payload.leaveType} (${payload.startDate} – ${payload.endDate})${payload.reason ? `: ${payload.reason}` : ''}`;

    const fallbackEmail = process.env.WEBHOOK_FALLBACK_EMAIL || null;
    const fallbackName = process.env.WEBHOOK_FALLBACK_NAME || null;

    const recipientEmail = payload.approverEmail || payload.requesterEmail || fallbackEmail;
    const recipientName = payload.approverName || payload.requesterName || fallbackName;

    if (!recipientEmail) {
      console.warn('No recipient email found for leave webhook; skipping POST to Power Automate');
      results.push({ success: false, error: 'no_recipient_email' });
    } else {
      // ปรับในส่วน notifyLeaveViaWebhook
    const paBody = {
      type: payload.type,
      requesterName: payload.requesterName,
      requesterEmail: payload.requesterEmail,
      approverName: payload.approverName,
      approverEmail: payload.approverEmail,
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      totalDays: payload.totalDays,
      reason: payload.reason || '',
      rejectedReason: payload.rejectedReason || '',
      appUrl: payload.appUrl,
      recipientEmail: recipientEmail,
    };

      const result = await sendToWebhook(targetWebhookUrl, paBody as any);
      results.push(result);
    }
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
