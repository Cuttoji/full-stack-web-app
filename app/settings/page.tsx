'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, Modal } from '@/components/ui';
import {
  User,
  Building,
  Shield,
  Lock,
  Save,
  Bell,
} from 'lucide-react';
import { ROLE_LABELS } from '@/lib/types';

export default function SettingsPage() {
  const { user } = useAuth();
  
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
      <div className="space-y-6 max-w-3xl text-gray-800 mt-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ตั้งค่า</h1>
          <p className="text-gray-700">จัดการบัญชีและการตั้งค่าส่วนตัว</p>
        </div>

        {/* Profile Section */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            ข้อมูลส่วนตัว
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-700">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อ-นามสกุล
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                อีเมล
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-700 mt-1">ไม่สามารถเปลี่ยนอีเมลได้</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เบอร์โทร
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0812345678"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Building className="w-4 h-4" />
                <span>{user.department?.name || '-'}</span>
              </div>
              {user.subUnit && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
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
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            ความปลอดภัย
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">รหัสผ่าน</p>
                <p className="text-sm text-gray-700">อัปเดตรหัสผ่านของคุณ</p>
              </div>
              <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)}>
                เปลี่ยนรหัสผ่าน
              </Button>
            </div>
          </div>
        </Card>

        {/* Notifications Section */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            การแจ้งเตือน
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">แจ้งเตือนอีเมล</p>
                <p className="text-sm text-gray-700">รับการแจ้งเตือนผ่านอีเมล</p>
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

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Push Notification</p>
                <p className="text-sm text-gray-700">รับการแจ้งเตือนบนเบราว์เซอร์</p>
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
          <h2 className="text-lg font-semibold mb-4">ข้อมูลบัญชี</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-700">วันลาคงเหลือ</span>
              <span className="font-medium">{user.leaveQuota} วัน</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-700">ตำแหน่ง</span>
              <span className="font-medium">{ROLE_LABELS[user.role]}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-700">แผนก</span>
              <span className="font-medium">{user.department?.name || '-'}</span>
            </div>
            {user.subUnit && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-700">กลุ่มงาน</span>
                <span className="font-medium">{user.subUnit.name}</span>
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {passwordError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่านปัจจุบัน
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
