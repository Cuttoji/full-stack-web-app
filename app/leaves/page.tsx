'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth, useRoleAccess } from '@/contexts/AuthContext';
import { Button, Card, Modal } from '@/components/ui';
import { Leave, LeaveStatus, CreateLeaveRequest } from '@/lib/types';
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from '@/lib/types';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  User,
  AlertTriangle,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function LeavesPage() {
  const { user } = useAuth();
  const { isLeader, isAdmin, isHeadTech } = useRoleAccess();
  
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'my' | 'pending' | 'all'>('my');
  
  // Create form states
  const [formData, setFormData] = useState<CreateLeaveRequest>({
    type: 'PERSONAL',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // For approval
  const [approvalNote, setApprovalNote] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [conflictingTasks, setConflictingTasks] = useState<{
    id: string;
    jobNumber: string;
    title: string;
    startDate: string;
    endDate: string;
    status: string;
  }[]>([]);
  const [hasTaskConflicts, setHasTaskConflicts] = useState(false);

  const fetchLeaves = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (viewMode === 'pending') {
        params.append('status', 'PENDING');
      } else if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (viewMode === 'my') {
        params.append('userId', user?.id || '');
      }

      const response = await fetch(`/api/leaves?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setLeaves(data.data.data);
      }
    } catch {
      console.error('Failed to fetch leaves');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, viewMode]);

  const handleCreateLeave = async () => {
    setFormError('');
    
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      setFormError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setFormError('วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsSubmitting(true);

      // Check for conflicting tasks first
      const validationResponse = await fetch(
        `/api/leaves/validate?userId=${user?.id}&startDate=${formData.startDate}&endDate=${formData.endDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const validationData = await validationResponse.json();
      if (validationData.success && validationData.data.hasConflicts) {
        setFormError(
          `คุณมีงานรอรับ ${validationData.data.conflictCount} งานในช่วงวันที่ลา กรุณาติดต่อ Leader เพื่อโอนงานก่อนส่งคำขอลา`
        );
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/leaves', {
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
        setFormData({ type: 'PERSONAL', startDate: '', endDate: '', reason: '' });
        fetchLeaves();
      } else {
        setFormError(result.error || 'ไม่สามารถส่งคำขอได้');
      }
    } catch {
      setFormError('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproval = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedLeave) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsApproving(true);
      const response = await fetch(`/api/leaves/${selectedLeave.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          approverNote: approvalNote,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsDetailModalOpen(false);
        setSelectedLeave(null);
        setApprovalNote('');
        fetchLeaves();
      } else {
        alert(result.error || 'ไม่สามารถดำเนินการได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setIsApproving(false);
    }
  };

  const openDetail = async (leave: Leave) => {
    setSelectedLeave(leave);
    setApprovalNote('');
    setConflictingTasks([]);
    setHasTaskConflicts(false);
    setIsDetailModalOpen(true);

    // If leader is viewing a pending leave, check for task conflicts
    if (canApprove && leave.status === LeaveStatus.PENDING) {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const validationResponse = await fetch(
          `/api/leaves/validate?userId=${leave.userId}&startDate=${leave.startDate}&endDate=${leave.endDate}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const validationData = await validationResponse.json();
        if (validationData.success && validationData.data.hasConflicts) {
          setHasTaskConflicts(true);
          setConflictingTasks(validationData.data.conflictingTasks);
        }
      } catch (error) {
        console.error('Failed to validate leave:', error);
      }
    }
  };

  const getStatusBadgeColor = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700';
      case LeaveStatus.APPROVED:
        return 'bg-green-100 text-green-700';
      case LeaveStatus.REJECTED:
        return 'bg-red-100 text-red-700';
      case LeaveStatus.CANCELLED:
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const canApprove = isLeader || isAdmin || isHeadTech;

  return (
    <DashboardLayout>
      <div className="space-y-6 text-gray-800">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">การลา</h1>
            <p className="text-gray-900">จัดการคำขอลางาน</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            ขอลา
          </Button>
        </div>

        {/* Leave Quota Info */}
        {user && (
          <Card padding="sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600">วันลาคงเหลือ:</span>
                <span className="font-semibold text-blue-600">{user.leaveQuota || 0} วัน</span>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs and Filters */}
        <Card padding="sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('my')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'my'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                การลาของฉัน
              </button>
              {canApprove && (
                <>
                  <button
                    onClick={() => setViewMode('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === 'pending'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    รออนุมัติ
                  </button>
                  <button
                    onClick={() => setViewMode('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                </>
              )}
            </div>

            {viewMode !== 'pending' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ทุกสถานะ</option>
                <option value="PENDING">รออนุมัติ</option>
                <option value="APPROVED">อนุมัติ</option>
                <option value="REJECTED">ไม่อนุมัติ</option>
                <option value="CANCELLED">ยกเลิก</option>
              </select>
            )}
          </div>
        </Card>

        {/* Leaves List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : leaves.length > 0 ? (
          <div className="space-y-4">
            {leaves.map((leave) => (
              <Card
                key={leave.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(leave)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(leave.status)}`}>
                        {LEAVE_STATUS_LABELS[leave.status]}
                      </span>
                      <span className="text-sm text-gray-500">
                        {LEAVE_TYPE_LABELS[leave.type as keyof typeof LEAVE_TYPE_LABELS]}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {leave.totalDays} วัน
                      </span>
                    </div>

                    {viewMode !== 'my' && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <User className="w-4 h-4" />
                        {leave.user?.name}
                      </div>
                    )}

                    <p className="text-gray-600">{leave.reason}</p>
                  </div>

                  {leave.status === LeaveStatus.PENDING && canApprove && viewMode === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeave(leave);
                          handleApproval('APPROVED');
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeave(leave);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">ไม่พบรายการลา</p>
              <p className="text-sm">ลองเปลี่ยนตัวกรองหรือสร้างคำขอลาใหม่</p>
            </div>
          </Card>
        )}
      </div>

      {/* Create Leave Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="ขอลางาน"
      >
        <div className="space-y-4 text-gray-800">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">ประเภทการลา</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'SICK' | 'PERSONAL' | 'VACATION' | 'OTHER' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PERSONAL">ลากิจ</option>
              <option value="SICK">ลาป่วย</option>
              <option value="VACATION">ลาพักร้อน</option>
              <option value="OTHER">อื่นๆ</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">วันที่เริ่ม</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">วันที่สิ้นสุด</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">เหตุผล</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ระบุเหตุผลการลา..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsCreateModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateLeave}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              ส่งคำขอ
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="รายละเอียดการลา"
        size="lg"
      >
        {selectedLeave && (
          <div className="space-y-4 text-gray-800">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(selectedLeave.status)}`}>
                {LEAVE_STATUS_LABELS[selectedLeave.status]}
              </span>
              <span className="text-sm text-gray-900 font-medium">
                {LEAVE_TYPE_LABELS[selectedLeave.type as keyof typeof LEAVE_TYPE_LABELS]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-900 font-semibold">ผู้ขอลา</p>
                <p className="font-medium text-gray-900">{selectedLeave.user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-900 font-semibold">จำนวนวัน</p>
                <p className="font-medium text-gray-900">{selectedLeave.totalDays} วัน</p>
              </div>
              <div>
                <p className="text-sm text-gray-900 font-semibold">วันที่เริ่ม</p>
                <p className="font-medium text-gray-900">{formatDate(selectedLeave.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-900 font-semibold">วันที่สิ้นสุด</p>
                <p className="font-medium text-gray-900">{formatDate(selectedLeave.endDate)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-900 font-semibold">เหตุผล</p>
              <p className="font-medium text-gray-900">{selectedLeave.reason}</p>
            </div>

            {selectedLeave.approver && (
              <div>
                <p className="text-sm text-gray-900 font-semibold">อนุมัติโดย</p>
                <p className="font-medium text-gray-900">{selectedLeave.approver.name}</p>
                {selectedLeave.approverNote && (
                  <p className="text-sm text-gray-900 mt-1">{selectedLeave.approverNote}</p>
                )}
              </div>
            )}

            {selectedLeave.status === LeaveStatus.PENDING && canApprove && (
              <div className="pt-4 border-t space-y-4">
                {/* Warning for conflicting tasks */}
                {hasTaskConflicts && conflictingTasks.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800 mb-2">
                          ⚠️ พนักงานมีงานรอรับ {conflictingTasks.length} งานในช่วงวันที่ลา
                        </p>
                        <div className="space-y-1">
                          {conflictingTasks.map((task) => (
                            <div key={task.id} className="text-sm text-red-700">
                              • {task.jobNumber}: {task.title}
                              <br />
                              <span className="text-xs text-red-600 ml-3">
                                {formatDate(task.startDate)} - {formatDate(task.endDate)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm font-medium text-red-800 mt-3">
                          กรุณาโอนงานให้ผู้อื่นก่อนอนุมัติการลา
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    หมายเหตุ (ถ้ามี)
                  </label>
                  <textarea
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เพิ่มหมายเหตุ..."
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleApproval('REJECTED')}
                    disabled={isApproving}
                    isLoading={isApproving}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    ไม่อนุมัติ
                  </Button>
                  <Button
                    variant="success"
                    className="flex-1"
                    onClick={() => handleApproval('APPROVED')}
                    disabled={isApproving || hasTaskConflicts}
                    isLoading={isApproving}
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                  >
                    {hasTaskConflicts ? 'ไม่สามารถอนุมัติได้' : 'อนุมัติ'}
                  </Button>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-900 pt-4 border-t">
              สร้างเมื่อ {formatDateTime(selectedLeave.createdAt)}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
