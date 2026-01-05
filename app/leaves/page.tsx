'use client';

import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth, useRoleAccess } from '@/contexts/AuthContext';
import { Button, Card, Modal } from '@/components/ui';
import { 
  Leave, 
  LeaveStatus, 
  LeaveType,
  LeaveDurationType,
  HalfDayPeriod,
  CreateLeaveRequest,
  LEAVE_TYPE_CONFIGS,
  UserLeaveBalance,
} from '@/lib/types';
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, LeaveDurationTypeLabels, HalfDayPeriodLabels } from '@/lib/types';
import {
  calculateLeaveMinutes,
  calculateLunchOverlap,
  formatMinutesToFullDisplay,
  generateTimeOptions,
  validateLeaveTime,
  MIN_LEAVE_MINUTES,
} from '@/lib/leaveCalculation';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  User,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

interface LeaveQuotaSummary {
  type: LeaveType;
  label: string;
  quota: number;
  used: number;
  pending: number;
  remaining: number;
  allowedDurationTypes: string[];
  note?: string;
}

export default function LeavesPage() {
  const { user } = useAuth();
  const { isLeader, isAdmin, isHeadTech, isFinanceLeader, isSalesLeader } = useRoleAccess();
  
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Leave Balance State
  const [, setLeaveBalance] = useState<UserLeaveBalance | null>(null);
  const [quotaSummary, setQuotaSummary] = useState<LeaveQuotaSummary[]>([]);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'my' | 'pending' | 'all'>('my');
  
  // Create form states
  const [formData, setFormData] = useState<CreateLeaveRequest>({
    type: 'PERSONAL',
    startDate: '',
    endDate: '',
    reason: '',
    durationType: LeaveDurationType.FULL_DAY,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formWarnings, setFormWarnings] = useState<string[]>([]);

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

  // Get allowed duration types for selected leave type
  const getAllowedDurationTypes = (leaveType: string): LeaveDurationType[] => {
    const config = LEAVE_TYPE_CONFIGS[leaveType as LeaveType];
    return config?.allowedDurationTypes || [LeaveDurationType.FULL_DAY];
  };

  // Get remaining quota for a specific leave type
  const getRemainingQuota = (leaveType: string): number => {
    const quota = quotaSummary.find(q => q.type === leaveType);
    return quota?.remaining || 0;
  };

  const fetchLeaveBalance = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/leaves/balance', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setLeaveBalance(data.data.balance);
        setQuotaSummary(data.data.summary);
      }
    } catch {
      console.error('Failed to fetch leave balance');
    }
  };

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
    fetchLeaveBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, viewMode]);

  // Calculate leave minutes for live preview
  const calculatedMinutes = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const isFullDay = formData.durationType === LeaveDurationType.FULL_DAY;
    return calculateLeaveMinutes(
      formData.startDate,
      formData.endDate,
      isFullDay,
      formData.startTime,
      formData.endTime
    );
  }, [formData.startDate, formData.endDate, formData.durationType, formData.startTime, formData.endTime]);

  // Generate time options for dropdowns
  const startTimeOptions = useMemo(() => generateTimeOptions(), []);
  const endTimeOptions = useMemo(() => 
    generateTimeOptions(formData.startTime), 
    [formData.startTime]
  );

  // Calculate lunch overlap for warning display
  const lunchOverlapMinutes = useMemo(() => {
    if (formData.durationType !== LeaveDurationType.TIME_BASED || !formData.startTime || !formData.endTime) {
      return 0;
    }
    const [startHour, startMinute] = formData.startTime.split(':').map(Number);
    const [endHour, endMinute] = formData.endTime.split(':').map(Number);
    return calculateLunchOverlap(startHour, startMinute, endHour, endMinute);
  }, [formData.durationType, formData.startTime, formData.endTime]);

  // Calculate raw minutes (before lunch deduction) for display
  const rawMinutes = useMemo(() => {
    if (formData.durationType !== LeaveDurationType.TIME_BASED || !formData.startTime || !formData.endTime) {
      return 0;
    }
    const [startHour, startMinute] = formData.startTime.split(':').map(Number);
    const [endHour, endMinute] = formData.endTime.split(':').map(Number);
    return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  }, [formData.durationType, formData.startTime, formData.endTime]);

  const handleCreateLeave = async () => {
    setFormError('');
    setFormWarnings([]);
    
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      setFormError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setFormError('วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }

    // Validate duration type for leave type
    const allowedTypes = getAllowedDurationTypes(formData.type as string);
    if (!allowedTypes.includes(formData.durationType as LeaveDurationType)) {
      setFormError(`ประเภทการลานี้ไม่รองรับการลาแบบ${LeaveDurationTypeLabels[formData.durationType as LeaveDurationType]}`);
      return;
    }

    // Validate TIME_BASED leave using new utility
    if (formData.durationType === LeaveDurationType.TIME_BASED) {
      if (!formData.startTime || !formData.endTime) {
        setFormError('กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด');
        return;
      }
      
      const validation = validateLeaveTime(formData.startTime, formData.endTime);
      if (!validation.valid) {
        setFormError(validation.error || 'เวลาไม่ถูกต้อง');
        return;
      }
    }

    // Check quota using calculated minutes
    const remaining = getRemainingQuota(formData.type as string);
    const requestDays = calculatedMinutes / 480; // 480 minutes = 1 day
    
    if (requestDays > remaining) {
      setFormError(`โควตา${LEAVE_TYPE_LABELS[formData.type as LeaveType]}ไม่เพียงพอ (คงเหลือ ${remaining} วัน)`);
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
        body: JSON.stringify({
          ...formData,
          totalDays: requestDays,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Show warnings if any
        if (result.data?.warnings && result.data.warnings.length > 0) {
          setFormWarnings(result.data.warnings);
        }
        setIsCreateModalOpen(false);
        setFormData({ 
          type: 'PERSONAL', 
          startDate: '', 
          endDate: '', 
          reason: '',
          durationType: LeaveDurationType.FULL_DAY,
        });
        fetchLeaves();
        fetchLeaveBalance(); // Refresh balance
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

  const canApprove = isLeader || isAdmin || isHeadTech || isFinanceLeader || isSalesLeader;

  return (
    <DashboardLayout>
      <div className="space-y-6 text-gray-800 mt-8">
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
        {user && quotaSummary.length > 0 && (
          <Card padding="md">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                โควตาการลาประจำปี {new Date().getFullYear()}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quotaSummary.filter(q => q.type !== LeaveType.OTHER).map((quota) => (
                  <div 
                    key={quota.type} 
                    className={`p-4 rounded-lg border ${
                      quota.remaining === 0 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{quota.label}</span>
                      {quota.note && (
                        <div className="group relative">
                          <Info className="w-4 h-4 text-gray-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                            {quota.note}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-bold ${
                        quota.remaining === 0 ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {quota.remaining}
                      </span>
                      <span className="text-sm text-gray-500">/ {quota.quota} วัน</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <div>ใช้ไป: {quota.used} วัน</div>
                      {quota.pending > 0 && (
                        <div className="text-yellow-600">รออนุมัติ: {quota.pending} วัน</div>
                      )}
                      <div className="text-gray-400">
                        รูปแบบ: {quota.allowedDurationTypes.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
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

          {formWarnings.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
              <div className="font-medium mb-1">⚠️ หมายเหตุ:</div>
              <ul className="list-disc list-inside">
                {formWarnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">ประเภทการลา</label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as LeaveType;
                const allowedDurations = getAllowedDurationTypes(newType);
                setFormData({ 
                  ...formData, 
                  type: newType,
                  durationType: allowedDurations[0], // Reset to first allowed type
                  halfDayPeriod: undefined,
                  startTime: undefined,
                  endTime: undefined,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SICK">ลาป่วย (คงเหลือ {getRemainingQuota('SICK')} วัน)</option>
              <option value="PERSONAL">ลากิจ (คงเหลือ {getRemainingQuota('PERSONAL')} วัน)</option>
              <option value="VACATION">ลาพักร้อน (คงเหลือ {getRemainingQuota('VACATION')} วัน)</option>
              <option value="BIRTHDAY">ลาเดือนเกิด (คงเหลือ {getRemainingQuota('BIRTHDAY')} วัน)</option>
              <option value="OTHER">อื่นๆ</option>
            </select>
            
            {/* Show leave type info */}
            {formData.type && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                {formData.type === 'SICK' && (
                  <span>ลาป่วย 30 วัน/ปี - ลาได้เต็มวันหรือครึ่งวัน (ลาเกิน 3 วันต้องมีใบรับรองแพทย์)</span>
                )}
                {formData.type === 'PERSONAL' && (
                  <span>ลากิจ 3 วัน/ปี - ลาได้เต็มวันเท่านั้น</span>
                )}
                {formData.type === 'VACATION' && (
                  <span>ลาพักร้อน สูงสุด 6 วัน/ปี - คำนวณจากอายุงาน (เดือน/2) ลาได้เต็มวันหรือตามเวลา</span>
                )}
                {formData.type === 'BIRTHDAY' && (
                  <span>ลาเดือนเกิด 1 วัน/ปี - ลาได้เฉพาะในเดือนเกิดเท่านั้น</span>
                )}
              </div>
            )}
          </div>

          {/* Duration Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">รูปแบบการลา</label>
            <div className="flex gap-2 flex-wrap">
              {getAllowedDurationTypes(formData.type as string).map((durationType) => (
                <button
                  key={durationType}
                  type="button"
                  onClick={() => setFormData({ 
                    ...formData, 
                    durationType,
                    halfDayPeriod: durationType === LeaveDurationType.HALF_DAY ? HalfDayPeriod.MORNING : undefined,
                    startTime: undefined,
                    endTime: undefined,
                  })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    formData.durationType === durationType
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {LeaveDurationTypeLabels[durationType]}
                </button>
              ))}
            </div>
          </div>

          {/* Half Day Period Selection */}
          {formData.durationType === LeaveDurationType.HALF_DAY && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">ช่วงเวลา</label>
              <div className="flex gap-2">
                {Object.values(HalfDayPeriod).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setFormData({ ...formData, halfDayPeriod: period })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      formData.halfDayPeriod === period
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {HalfDayPeriodLabels[period]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time Based Selection */}
          {formData.durationType === LeaveDurationType.TIME_BASED && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">เวลาเริ่ม</label>
                  <select
                    value={formData.startTime || ''}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value, endTime: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">เลือกเวลา</option>
                    {startTimeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">เวลาสิ้นสุด</label>
                  <select
                    value={formData.endTime || ''}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.startTime}
                  >
                    <option value="">เลือกเวลา</option>
                    {endTimeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Info className="w-4 h-4" />
                  <span className="font-medium">ข้อมูลการลา</span>
                </div>
                <ul className="text-blue-600 text-xs space-y-1 ml-6">
                  <li>• เวลาทำงาน: 08:00 - 17:30 น.</li>
                  <li>• พักเที่ยง: 12:00 - 13:00 น. (หักออกอัตโนมัติ)</li>
                  <li>• ขั้นต่ำ: {MIN_LEAVE_MINUTES} นาที</li>
                </ul>
              </div>
            </div>
          )}

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

          {/* Live Preview - แสดงเวลาที่คำนวณได้ */}
          {formData.startDate && formData.endDate && (
            <div className={`p-4 border rounded-lg ${
              calculatedMinutes > 0 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className={`flex items-center gap-2 font-medium mb-2 ${
                calculatedMinutes > 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                <Clock className="w-5 h-5" />
                <span>สรุปการลาครั้งนี้</span>
              </div>
              
              {calculatedMinutes > 0 ? (
                <div className="text-green-600 space-y-2">
                  <p className="text-lg font-bold">
                    คุณกำลังขอ{LEAVE_TYPE_LABELS[formData.type as LeaveType]}เป็นเวลา {formatMinutesToFullDisplay(calculatedMinutes)}
                  </p>
                  
                  {/* แสดงรายละเอียดการคำนวณสำหรับ TIME_BASED */}
                  {formData.durationType === LeaveDurationType.TIME_BASED && formData.startTime && formData.endTime && (
                    <div className="text-sm space-y-1 pt-2 border-t border-green-200">
                      <p className="font-medium">📊 รายละเอียดการคำนวณ:</p>
                      <p>• เวลา: {formData.startTime} - {formData.endTime} ({rawMinutes} นาที)</p>
                      {lunchOverlapMinutes > 0 && (
                        <p>• หักพักเที่ยง: -{lunchOverlapMinutes} นาที</p>
                      )}
                      <p className="font-semibold">• นาทีที่ลาจริง: {calculatedMinutes} นาที</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-green-500">
                    (คิดเป็น {(calculatedMinutes / 480).toFixed(2)} วันทำงาน)
                  </p>
                </div>
              ) : (
                <div className="text-red-600 space-y-1">
                  <p className="font-bold">⚠️ ไม่สามารถลาได้</p>
                  {formData.durationType === LeaveDurationType.TIME_BASED && rawMinutes > 0 && rawMinutes <= lunchOverlapMinutes && (
                    <p className="text-sm">ช่วงเวลาที่เลือกอยู่ในช่วงพักเที่ยง (12:00-13:00) ทั้งหมด</p>
                  )}
                  {formData.durationType === LeaveDurationType.TIME_BASED && rawMinutes < MIN_LEAVE_MINUTES && (
                    <p className="text-sm">ระยะเวลาการลาขั้นต่ำคือ {MIN_LEAVE_MINUTES} นาที</p>
                  )}
                </div>
              )}
              
              {/* แสดงคำเตือนเมื่อมีการหักพักเที่ยง */}
              {lunchOverlapMinutes > 0 && calculatedMinutes > 0 && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>ระบบได้หักช่วงพักเที่ยง ({lunchOverlapMinutes} นาที) ออกจากการลาให้คุณแล้ว</span>
                </div>
              )}
            </div>
          )}

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
