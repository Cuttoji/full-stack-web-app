'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth, useRoleAccess } from '@/contexts/AuthContext';
import { Button, Card, Modal } from '@/components/ui';
import { User, Role, Department, SubUnit, CreateUserRequest } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/types';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users as UsersIcon,
  Mail,
  Phone,
  Shield,
  AlertTriangle,
  Calendar,
  Car as CarIcon,
} from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuth();
  const { isAdmin } = useRoleAccess();
  
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subUnits, setSubUnits] = useState<SubUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'daily'>('all');
  
  // Daily technician states - weekly schedule (6 days, Mon-Sat)
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string>>({
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
  });
  const [tempTechnicianId, setTempTechnicianId] = useState<string>('');
  const [isTempAssignment, setIsTempAssignment] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    password: '',
    name: '',
    role: Role.TECH,
    departmentId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });

      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (departmentFilter) params.append('departmentId', departmentFilter);

      const response = await fetch(`/api/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setUsers(data.data.data);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, departmentFilter, page]);

  const fetchDepartments = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchSubUnits = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/sub-units', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setSubUnits(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sub-units:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchSubUnits();
  }, [fetchUsers]);

  const handleCreateUser = async () => {
    setFormError('');
    
    if (!formData.email || !formData.password || !formData.name || !formData.departmentId) {
      setFormError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setIsCreateModalOpen(false);
        resetForm();
        fetchUsers();
      } else {
        setFormError(result.error || 'ไม่สามารถสร้างผู้ใช้ได้');
      }
    } catch {
      setFormError('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setFormError('');

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsSubmitting(true);
      
      // Build update data - convert password to newPassword for API
      const { password, ...rest } = formData;
      const updateData: Record<string, unknown> = { ...rest };
      
      // Only include newPassword if password was provided
      if (password) {
        updateData.newPassword = password;
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      if (result.success) {
        setIsEditModalOpen(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
      } else {
        setFormError(result.error || 'ไม่สามารถอัปเดตได้');
      }
    } catch {
      setFormError('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.success) {
        setIsDeleteConfirmOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        alert(result.error || 'ไม่สามารถลบได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      departmentId: user.departmentId || '',
      subUnitId: user.subUnitId || undefined,
      phone: user.phone || undefined,
      leaveQuota: user.leaveQuota,
      permissions: user.permissions || {},
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openDeleteConfirm = (user: User) => {
    setSelectedUser(user);
    setIsDeleteConfirmOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: Role.TECH,
      departmentId: '',
    });
    setFormError('');
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'bg-purple-100 text-purple-700';
      case Role.FINANCE:
        return 'bg-green-100 text-green-700';
      case Role.SALES:
        return 'bg-blue-100 text-blue-700';
      case Role.HEAD_TECH:
        return 'bg-orange-100 text-orange-700';
      case Role.LEADER:
        return 'bg-yellow-100 text-yellow-700';
      case Role.TECH:
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Filter sub-units based on selected department
  const filteredSubUnits = subUnits.filter(
    (su) => !formData.departmentId || su.departmentId === formData.departmentId
  );

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">ไม่มีสิทธิ์เข้าถึง</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">หน้านี้สำหรับ Admin เท่านั้น</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 text-gray-800 dark:text-gray-200 mt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการผู้ใช้</h1>
            <p className="text-gray-500 dark:text-gray-400">ดูและจัดการผู้ใช้ทั้งหมดในระบบ</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            เพิ่มผู้ใช้
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <UsersIcon className="w-4 h-4 inline-block mr-2" />
            จัดการผู้ใช้ทั้งหมด
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'daily'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Calendar className="w-4 h-4 inline-block mr-2" />
            ช่างประจำวัน
          </button>
        </div>

        {activeTab === 'all' ? (
          <>
            {/* Filters */}
        <Card padding="sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 w-full md:max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, อีเมล..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">ทุกตำแหน่ง</option>
                {Object.values(Role).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">ทุกแผนก</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Users List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : users.length > 0 ? (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      ผู้ใช้
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      ตำแหน่ง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      แผนก
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      วันลา
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-300 font-medium">
                                {u.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {u.email}
                            </div>
                            {u.phone && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {u.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(u.role)}`}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{u.department?.name || '-'}</div>
                        {u.subUnit && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.subUnit.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {u.leaveQuota} วัน
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(u)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {u.id !== user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => openDeleteConfirm(u)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <UsersIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">ไม่พบผู้ใช้</p>
              <p className="text-sm">ลองเปลี่ยนตัวกรองหรือเพิ่มผู้ใช้ใหม่</p>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ก่อนหน้า
            </Button>
            <span className="px-4 py-2 text-gray-600 dark:text-gray-300">
              หน้า {page} จาก {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              ถัดไป
            </Button>
          </div>
        )}
          </>
        ) : (
          /* Daily Technician Assignment Tab */
          <Card>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">จัดช่างประจำวัน</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  วันนี้: {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>

              {/* Weekly Schedule */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">ตารางช่างประจำสัปดาห์ (จันทร์ - เสาร์)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  {[
                    { key: 'monday', label: 'จันทร์', shortLabel: 'จ.' },
                    { key: 'tuesday', label: 'อังคาร', shortLabel: 'อ.' },
                    { key: 'wednesday', label: 'พุธ', shortLabel: 'พ.' },
                    { key: 'thursday', label: 'พฤหัสบดี', shortLabel: 'พฤ.' },
                    { key: 'friday', label: 'ศุกร์', shortLabel: 'ศ.' },
                    { key: 'saturday', label: 'เสาร์', shortLabel: 'ส.' },
                  ].map((day) => {
                    const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === day.key;
                    return (
                      <div
                        key={day.key}
                        className={`p-3 rounded-lg border ${
                          isToday 
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-800' 
                            : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <label className={`block text-xs font-semibold mb-2 ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                          {day.label}
                          {isToday && <span className="ml-1 text-blue-500 dark:text-blue-400">(วันนี้)</span>}
                        </label>
                        <select
                          value={weeklySchedule[day.key] || ''}
                          onChange={(e) => setWeeklySchedule({ ...weeklySchedule, [day.key]: e.target.value })}
                          className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isToday ? 'border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 dark:text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white'
                          }`}
                        >
                          <option value="">-- เลือกช่าง --</option>
                          {users.filter(u => u.role === Role.TECH || u.role === Role.LEADER).map((tech) => (
                            <option key={tech.id} value={tech.id}>
                              {tech.name}
                            </option>
                          ))}
                        </select>
                        {weeklySchedule[day.key] && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {users.find(u => u.id === weeklySchedule[day.key])?.subUnit?.name || 
                             users.find(u => u.id === weeklySchedule[day.key])?.department?.name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 italic">* วันอาทิตย์หยุดทำการ</p>
              </div>

              {/* Today's Technician Summary */}
              {(() => {
                const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                const isSunday = todayKey === 'sunday';
                const todayTechId = weeklySchedule[todayKey];
                const todayTech = users.find(u => u.id === todayTechId);
                
                if (isSunday) {
                  return (
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        วันอาทิตย์ - หยุดทำการ
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">วันนี้ไม่มีช่างประจำวัน (วันหยุด)</p>
                    </div>
                  );
                }
                
                return (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                      <UsersIcon className="w-4 h-4" />
                      ช่างประจำวันนี้
                    </h4>
                    {todayTech ? (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-300 font-medium">
                            {todayTech.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-blue-900 dark:text-white">{todayTech.name}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {todayTech.subUnit?.name || todayTech.department?.name || 'ไม่ระบุแผนก'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-600 dark:text-blue-400">ยังไม่ได้กำหนดช่างประจำวันนี้</p>
                    )}
                  </div>
                );
              })()}

              {/* Temporary Assignment */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    <AlertTriangle className="w-4 h-4 inline-block mr-2" />
                    มอบหมายช่างชั่วคราว (วันนี้เท่านั้น)
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTempAssignment}
                      onChange={(e) => setIsTempAssignment(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                  </label>
                </div>
                
                {isTempAssignment && (
                  <>
                    <select
                      value={tempTechnicianId}
                      onChange={(e) => setTempTechnicianId(e.target.value)}
                      className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">-- เลือกช่างชั่วคราว --</option>
                      {users.filter(u => u.role === Role.TECH || u.role === Role.LEADER).map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} ({tech.subUnit?.name || tech.department?.name || 'ไม่ระบุแผนก'})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                      ⚠️ ช่างชั่วคราวจะได้รับสิทธิ์แทนช่างประจำวันนี้ และจะกลับไปใช้ช่างเดิมเมื่อสิ้นสุดวัน
                    </p>
                  </>
                )}
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                <Button variant="outline" className="flex-1" onClick={() => {
                  setWeeklySchedule({
                    monday: '',
                    tuesday: '',
                    wednesday: '',
                    thursday: '',
                    friday: '',
                    saturday: '',
                  });
                  setTempTechnicianId('');
                  setIsTempAssignment(false);
                }}>
                  รีเซ็ตทั้งหมด
                </Button>
                <Button className="flex-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  บันทึกตารางประจำสัปดาห์
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Create/Edit User Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedUser(null);
          resetForm();
        }}
        title={isEditModalOpen ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
        size="lg"
      >
        <div className="space-y-4 text-gray-800 dark:text-gray-200">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ชื่อ-นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="ชื่อ นามสกุล"
              />
            </div>

            {/* Show email/password only when creating new user */}
            {!isEditModalOpen && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    อีเมล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    รหัสผ่าน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ตำแหน่ง <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {Object.values(Role).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                แผนก <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, subUnitId: undefined })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">เลือกแผนก</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">กลุ่มงาน</label>
              <select
                value={formData.subUnitId || ''}
                onChange={(e) => setFormData({ ...formData, subUnitId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={!formData.departmentId}
              >
                <option value="">ไม่มี</option>
                {filteredSubUnits.map((su) => (
                  <option key={su.id} value={su.id}>
                    {su.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Permissions Section */}
          {isEditModalOpen && selectedUser && (
            <div className="border-t dark:border-gray-700 pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Shield className="w-5 h-5" />
                สิทธิ์การใช้งาน
              </h3>
              
              <div className="space-y-4">
                {/* Manage Tasks (Combined) */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">จัดการงาน</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">เพิ่ม แก้ไขรายละเอียด และมอบหมายงาน</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canManageTasks || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canManageTasks: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Approve Leave */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">อนุมัติลา</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">อนุมัติหรือปฏิเสธคำขอลา</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canApproveLeave || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canApproveLeave: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Approve Documents */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">อนุมัติเอกสาร</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">อนุมัติหรือปฏิเสธเอกสารต่างๆ</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canApproveDocuments || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canApproveDocuments: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Manage Fleet */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">จัดการรถทั้งหมด</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">เพิ่ม แก้ไข ลบ และจัดสรรรถ</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canManageFleet || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canManageFleet: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Manage Users */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">จัดการผู้ใช้</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">เพิ่ม แก้ไข และลบผู้ใช้ในระบบ</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canManageUsers || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canManageUsers: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Manage Daily Technician */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">ปรับเปลี่ยนช่างประจำวัน</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">มอบหมายและปรับเปลี่ยนช่างประจำวัน</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canManageDailyTechnician || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canManageDailyTechnician: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedUser(null);
                resetForm();
              }}
            >
              ยกเลิก
            </Button>
            <Button
              className="flex-1"
              onClick={isEditModalOpen ? handleUpdateUser : handleCreateUser}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {isEditModalOpen ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setSelectedUser(null);
        }}
        title="ยืนยันการลบ"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-300">คุณต้องการลบผู้ใช้นี้หรือไม่?</p>
              <p className="text-sm text-red-700 dark:text-red-400">{selectedUser?.name} ({selectedUser?.email})</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setSelectedUser(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteUser}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              ลบ
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
