require('dotenv').config();

(async () => {
  const url = process.env.WEBHOOK_LEAVE_URL || process.env.POWER_AUTOMATE_URL || process.env.POWER_AUTOMATE_URL;
  if (!url) {
    console.error('WEBHOOK_LEAVE_URL / POWER_AUTOMATE_URL not set in environment');
    process.exit(1);
  }

  const payload = {
    type: 'LEAVE_APPROVED',
    leaveId: 'test-leave-123',
    requesterName: 'ทดสอบ ผู้ขอลา',
    requesterEmail: 'harit@rayong-oa.com',
    approverName: 'Admin Tester',
    approverEmail: 'admin@rayong-oa.com',
    approverRole: 'ADMIN',
    leaveType: 'VACATION',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    totalDays: 1,
    approvedAt: new Date().toISOString(),
    reason: 'ทดสอบ webhook - อนุมัติจากผู้ดูแลระบบ',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('Status:', res.status, res.statusText);
    try {
      const text = await res.text();
      console.log('Response body:', text.slice(0, 200));
    } catch (e) {
      console.log('No response body or failed to read body');
    }
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
})();
