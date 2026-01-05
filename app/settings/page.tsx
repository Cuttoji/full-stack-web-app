'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button, Card, Modal } from '@/components/ui';
import {
  User,
  Building,
  Shield,
  Lock,
  Save,
  Bell,
  Sun,
  Moon,
} from 'lucide-react';
import { ROLE_LABELS } from '@/lib/types';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  
  // Profile states
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  
  // Password states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    try {
      setIsProfileSaving(true);
      setProfileMessage('');

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone }),
      });

      const result = await response.json();
      if (result.success) {
        setProfileMessage('บันทึกข้อมูลสำเร็จ');
        // Refresh user data
        const meResponse = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meResponse.json();
        if (meData.success) {
          // Update local storage and context
          localStorage.setItem('user', JSON.stringify(meData.data));
        }
      } else {
        setProfileMessage(result.error || 'ไม่สามารถบันทึกได้');
      }
    } catch {
      setProfileMessage('เกิดข้อผิดพลาด');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token || !user) return;

    try {
      setIsPasswordSaving(true);

      const response = await fetch(`/api/users/${user.id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        alert('เปลี่ยนรหัสผ่านสำเร็จ');
      } else {
        setPasswordError(result.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      }
    } catch {
      setPasswordError('เกิดข้อผิดพลาด');
    } finally {
      setIsPasswordSaving(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">กำลังโหลด...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl text-gray-900 dark:text-white mt-8 mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ตั้งค่า</h1>
          <p className="text-gray-700 dark:text-gray-200">จัดการบัญชีและการตั้งค่าส่วนตัว</p>
        </div>

        {/* Profile Section */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <User className="w-5 h-5" />
            ข้อมูลส่วนตัว
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                ชื่อ-นามสกุล
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                อีเมล
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400"
              />
              <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">ไม่สามารถเปลี่ยนอีเมลได้</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                เบอร์โทร
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0812345678"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Building className="w-4 h-4" />
                <span>{user.department?.name || '-'}</span>
              </div>
              {user.subUnit && (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Shield className="w-4 h-4" />
                  <span>{user.subUnit.name}</span>
                </div>
              )}
            </div>

            {profileMessage && (
              <p
                className={`text-sm ${
                  profileMessage.includes('สำเร็จ') ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {profileMessage}
              </p>
            )}

            <Button
              onClick={handleSaveProfile}
              disabled={isProfileSaving}
              isLoading={isProfileSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              บันทึก
            </Button>
          </div>
        </Card>

        {/* Security Section */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Lock className="w-5 h-5" />
            ความปลอดภัย
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">รหัสผ่าน</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">อัปเดตรหัสผ่านของคุณ</p>
              </div>
              <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)}>
                เปลี่ยนรหัสผ่าน
              </Button>
            </div>
          </div>
        </Card>

        {/* Theme Section */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
            {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            ธีมการแสดงผล
          </h2>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              เลือกธีมที่ต้องการ: ท้องฟ้ากลางวัน หรือ ท้องฟ้ากลางคืน
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Light Theme Option */}
              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div 
                  className="w-full h-20 rounded-lg mb-3 relative overflow-hidden"
                  style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #B0E2FF 50%, #E0F4FF 100%)' }}
                >
                  {/* Mini clouds */}
                  <div className="absolute top-2 left-3 w-8 h-3 bg-white rounded-full opacity-90" />
                  <div className="absolute top-4 right-4 w-6 h-2 bg-white rounded-full opacity-80" />
                  <div className="absolute bottom-3 left-6 w-7 h-2 bg-white rounded-full opacity-70" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span className={`font-medium ${theme === 'light' ? 'text-blue-700' : 'text-gray-700 dark:text-gray-300'}`}>
                    กลางวัน
                  </span>
                </div>
                {theme === 'light' && (
                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">✓ เลือกอยู่</div>
                )}
              </button>

              {/* Dark Theme Option */}
              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div 
                  className="w-full h-20 rounded-lg mb-3 relative overflow-hidden"
                  style={{ background: 'linear-gradient(180deg, #0c1445 0%, #1a237e 50%, #311b92 100%)' }}
                >
                  {/* Mini stars */}
                  <div className="absolute top-2 left-3 w-1 h-1 bg-white rounded-full animate-pulse" />
                  <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-white rounded-full opacity-80" />
                  <div className="absolute bottom-3 left-6 w-1 h-1 bg-white rounded-full animate-pulse" />
                  <div className="absolute top-3 right-8 w-1 h-1 bg-white rounded-full opacity-70" />
                  <div className="absolute bottom-4 right-3 w-1.5 h-1.5 bg-white rounded-full" />
                  {/* Mini moon */}
                  <div className="absolute top-2 right-2 w-5 h-5 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full shadow-lg" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className={`font-medium ${theme === 'dark' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    กลางคืน
                  </span>
                </div>
                {theme === 'dark' && (
                  <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">✓ เลือกอยู่</div>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* Notifications Section */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Bell className="w-5 h-5" />
            การแจ้งเตือน
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">แจ้งเตือนอีเมล</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">รับการแจ้งเตือนผ่านอีเมล</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Push Notification</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">รับการแจ้งเตือนบนเบราว์เซอร์</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushNotifications}
                  onChange={(e) => setPushNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Account Info */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">ข้อมูลบัญชี</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-600">
              <span className="text-gray-700 dark:text-gray-300">วันลาคงเหลือ</span>
              <span className="font-medium text-gray-900 dark:text-white">{user.leaveQuota} วัน</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-600">
              <span className="text-gray-700 dark:text-gray-300">ตำแหน่ง</span>
              <span className="font-medium text-gray-900 dark:text-white">{ROLE_LABELS[user.role]}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-600">
              <span className="text-gray-700 dark:text-gray-300">แผนก</span>
              <span className="font-medium text-gray-900 dark:text-white">{user.department?.name || '-'}</span>
            </div>
            {user.subUnit && (
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-600">
                <span className="text-gray-700 dark:text-gray-300">กลุ่มงาน</span>
                <span className="font-medium text-gray-900 dark:text-white">{user.subUnit.name}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordError('');
        }}
        title="เปลี่ยนรหัสผ่าน"
      >
        <div className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {passwordError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              รหัสผ่านปัจจุบัน
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordError('');
              }}
            >
              ยกเลิก
            </Button>
            <Button
              className="flex-1"
              onClick={handleChangePassword}
              disabled={isPasswordSaving}
              isLoading={isPasswordSaving}
            >
              เปลี่ยนรหัสผ่าน
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
