/**
 * Email Service
 * บริการส่งอีเมลผ่าน Outlook/SMTP
 */

import nodemailer from 'nodemailer';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email sending result
interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email content interface
interface EmailContent {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

// Get email configuration from environment variables
const getEmailConfig = (): EmailConfig | null => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587');
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.warn('Email configuration not found. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    return null;
  }

  return {
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  };
};

// Create transporter (singleton pattern)
let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter | null => {
  if (transporter) return transporter;

  const config = getEmailConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    // For Outlook/Office 365
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    },
  });

  return transporter;
};

/**
 * ส่งอีเมล
 */
export async function sendEmail(content: EmailContent): Promise<EmailResult> {
  try {
    const transport = getTransporter();
    
    if (!transport) {
      console.warn('Email not configured, skipping email send');
      return { success: false, error: 'Email not configured' };
    }

    const fromEmail = process.env.SMTP_USER || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'Task Management System';

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(content.to) ? content.to.join(', ') : content.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * ส่งอีเมลแจ้งเตือนการขอลาไปยังผู้อนุมัติ
 */
export async function sendLeaveRequestEmail(
  approverEmail: string,
  approverName: string,
  requesterName: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  totalDays: number,
  reason: string
): Promise<EmailResult> {
  const formatDate = (date: Date) => date.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dateRange = startDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0]
    ? formatDate(startDate)
    : `${formatDate(startDate)} - ${formatDate(endDate)}`;

  const subject = `[ขอลา] ${requesterName} ขอ${leaveType} ${totalDays} วัน`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0078d4; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .label { color: #666; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; font-weight: 600; color: #333; }
        .btn { display: inline-block; padding: 12px 24px; background: #0078d4; color: white; text-decoration: none; border-radius: 4px; margin: 10px 5px 10px 0; }
        .btn-approve { background: #107c10; }
        .btn-reject { background: #d13438; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">📋 คำขอลางานใหม่</h2>
        </div>
        <div class="content">
          <p>สวัสดีคุณ ${approverName},</p>
          <p>มีคำขอลางานรอการอนุมัติจากคุณ:</p>
          
          <div class="info-box">
            <div style="margin-bottom: 12px;">
              <div class="label">ผู้ขอลา</div>
              <div class="value">👤 ${requesterName}</div>
            </div>
            <div style="margin-bottom: 12px;">
              <div class="label">ประเภทการลา</div>
              <div class="value">📌 ${leaveType}</div>
            </div>
            <div style="margin-bottom: 12px;">
              <div class="label">วันที่ลา</div>
              <div class="value">📅 ${dateRange}</div>
            </div>
            <div style="margin-bottom: 12px;">
              <div class="label">จำนวนวัน</div>
              <div class="value">⏱️ ${totalDays} วัน</div>
            </div>
            <div>
              <div class="label">เหตุผล</div>
              <div class="value">💬 ${reason || '-'}</div>
            </div>
          </div>

          <p>กรุณาเข้าสู่ระบบเพื่ออนุมัติหรือปฏิเสธคำขอนี้:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leaves" class="btn">
            🔗 ดูคำขอในระบบ
          </a>
        </div>
        <div class="footer">
          <p>อีเมลนี้ส่งจากระบบ Task Management System โดยอัตโนมัติ</p>
          <p>กรุณาอย่าตอบกลับอีเมลนี้</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
คำขอลางานใหม่

สวัสดีคุณ ${approverName},

มีคำขอลางานรอการอนุมัติจากคุณ:

ผู้ขอลา: ${requesterName}
ประเภทการลา: ${leaveType}
วันที่ลา: ${dateRange}
จำนวนวัน: ${totalDays} วัน
เหตุผล: ${reason || '-'}

กรุณาเข้าสู่ระบบเพื่ออนุมัติหรือปฏิเสธคำขอนี้:
${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leaves

---
อีเมลนี้ส่งจากระบบ Task Management System โดยอัตโนมัติ
  `;

  return sendEmail({
    to: approverEmail,
    subject,
    html,
    text,
  });
}

/**
 * ส่งอีเมลแจ้งผลการอนุมัติการลา
 */
export async function sendLeaveApprovalEmail(
  requesterEmail: string,
  requesterName: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  totalDays: number,
  approved: boolean,
  approverName: string,
  rejectedReason?: string
): Promise<EmailResult> {
  const formatDate = (date: Date) => date.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dateRange = startDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0]
    ? formatDate(startDate)
    : `${formatDate(startDate)} - ${formatDate(endDate)}`;

  const subject = approved 
    ? `✅ [อนุมัติ] คำขอ${leaveType}ของคุณได้รับการอนุมัติแล้ว`
    : `❌ [ไม่อนุมัติ] คำขอ${leaveType}ของคุณถูกปฏิเสธ`;

  const statusColor = approved ? '#107c10' : '#d13438';
  const statusIcon = approved ? '✅' : '❌';
  const statusText = approved ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .label { color: #666; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; font-weight: 600; color: #333; }
        .status { font-size: 24px; font-weight: bold; color: ${statusColor}; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">${statusIcon} ผลการอนุมัติการลา</h2>
        </div>
        <div class="content">
          <p>สวัสดีคุณ ${requesterName},</p>
          
          <div class="info-box" style="text-align: center;">
            <div class="status">${statusIcon} ${statusText}</div>
          </div>

          <div class="info-box">
            <div style="margin-bottom: 12px;">
              <div class="label">ประเภทการลา</div>
              <div class="value">📌 ${leaveType}</div>
            </div>
            <div style="margin-bottom: 12px;">
              <div class="label">วันที่ลา</div>
              <div class="value">📅 ${dateRange}</div>
            </div>
            <div style="margin-bottom: 12px;">
              <div class="label">จำนวนวัน</div>
              <div class="value">⏱️ ${totalDays} วัน</div>
            </div>
            <div style="margin-bottom: 12px;">
              <div class="label">อนุมัติโดย</div>
              <div class="value">👤 ${approverName}</div>
            </div>
            ${!approved && rejectedReason ? `
            <div>
              <div class="label">เหตุผลที่ไม่อนุมัติ</div>
              <div class="value" style="color: #d13438;">💬 ${rejectedReason}</div>
            </div>
            ` : ''}
          </div>

          ${approved ? `
          <p>คำขอลาของคุณได้รับการอนุมัติเรียบร้อยแล้ว ขอให้มีความสุขในวันหยุด!</p>
          ` : `
          <p>หากมีข้อสงสัย กรุณาติดต่อผู้อนุมัติหรือฝ่ายบุคคล</p>
          `}
        </div>
        <div class="footer">
          <p>อีเมลนี้ส่งจากระบบ Task Management System โดยอัตโนมัติ</p>
          <p>กรุณาอย่าตอบกลับอีเมลนี้</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = approved 
    ? `
ผลการอนุมัติการลา

สวัสดีคุณ ${requesterName},

คำขอ${leaveType}ของคุณได้รับการอนุมัติแล้ว!

ประเภทการลา: ${leaveType}
วันที่ลา: ${dateRange}
จำนวนวัน: ${totalDays} วัน
อนุมัติโดย: ${approverName}

ขอให้มีความสุขในวันหยุด!

---
อีเมลนี้ส่งจากระบบ Task Management System โดยอัตโนมัติ
    `
    : `
ผลการอนุมัติการลา

สวัสดีคุณ ${requesterName},

คำขอ${leaveType}ของคุณถูกปฏิเสธ

ประเภทการลา: ${leaveType}
วันที่ลา: ${dateRange}
จำนวนวัน: ${totalDays} วัน
พิจารณาโดย: ${approverName}
${rejectedReason ? `เหตุผล: ${rejectedReason}` : ''}

หากมีข้อสงสัย กรุณาติดต่อผู้อนุมัติหรือฝ่ายบุคคล

---
อีเมลนี้ส่งจากระบบ Task Management System โดยอัตโนมัติ
    `;

  return sendEmail({
    to: requesterEmail,
    subject,
    html,
    text,
  });
}

/**
 * ทดสอบการเชื่อมต่อ SMTP
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    if (!transport) return false;

    await transport.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
}
