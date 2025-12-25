'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRoleAccess } from '@/contexts/AuthContext';
import { Button, Card, StatusBadge, Modal } from '@/components/ui';
import { Task, TaskStatus } from '@/lib/types';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  Car,
  MapPin,
  FileText,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

interface TaskReport {
  task: Task;
  needsApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  checklist?: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  note?: string;
}

export default function ReportsPage() {
  const { isAdmin, isFinance, isHeadTech } = useRoleAccess();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  
  // Checklist states
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', label: 'งานเสร็จสมบูรณ์ตามที่มอบหมาย', checked: false },
    { id: '2', label: 'มีหลักฐานการทำงานครบถ้วน (รูปภาพ)', checked: false },
    { id: '3', label: 'ลูกค้าพึงพอใจกับผลงาน', checked: false },
    { id: '4', label: 'อุปกรณ์/วัสดุครบถ้วน ไม่สูญหาย', checked: false },
    { id: '5', label: 'รถและอุปกรณ์อยู่ในสภาพดี', checked: false },
    { id: '6', label: 'พื้นที่ทำงานสะอาดเรียบร้อย', checked: false },
  ]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    fetchCompletedTasks();
  }, [dateFrom, dateTo, statusFilter]);

  const fetchCompletedTasks = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: TaskStatus.DONE,
        limit: '50',
      });

      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);

      const response = await fetch(`/api/tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTasks(data.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openChecklistModal = (task: Task) => {
    setSelectedTask(task);
    setIsChecklistModalOpen(true);
    // Reset checklist
    setChecklist(checklist.map(item => ({ ...item, checked: false, note: '' })));
    setAdditionalNotes('');
  };

  const handleApproveTask = async () => {
    if (!selectedTask) return;

    const allChecked = checklist.every(item => item.checked);
    if (!allChecked) {
      alert('กรุณาตรวจสอบรายการให้ครบถ้วน');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsApproving(true);
      
      // In a real app, you would send this to an API
      const approvalData = {
        taskId: selectedTask.id,
        checklist: checklist,
        notes: additionalNotes,
        approvedAt: new Date().toISOString(),
      };

      // Simulate API call
      console.log('Approving task:', approvalData);
      
      // TODO: Send to API
      // const response = await fetch(`/api/tasks/${selectedTask.id}/approve`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`,
      //   },
      //   body: JSON.stringify(approvalData),
      // });

      alert('ตรวจสอบและอนุมัติงานเรียบร้อยแล้ว');
      setIsChecklistModalOpen(false);
      fetchCompletedTasks();
    } catch (error) {
      console.error('Failed to approve task:', error);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setIsApproving(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !task.title.toLowerCase().includes(searchLower) &&
        !task.jobNumber.toLowerCase().includes(searchLower) &&
        !task.customerName?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  });

  const canApprove = isAdmin || isFinance || isHeadTech;

  if (!canApprove) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">ไม่มีสิทธิ์เข้าถึง</p>
          <p className="text-sm text-gray-500">หน้านี้สำหรับผู้ดูแลและผู้บริหารเท่านั้น</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายงานและการตรวจสอบงาน</h1>
          <p className="text-gray-700">ตรวจสอบและอนุมัติงานที่เสร็จสิ้นแล้ว</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">งานทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{filteredTasks.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">รอตรวจสอบ</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredTasks.filter(t => !t.completedAt).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">อนุมัติแล้ว</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredTasks.filter(t => t.completedAt).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">มีปัญหา</p>
                <p className="text-2xl font-bold text-red-600">0</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหางาน, เลขงาน, ลูกค้า..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="จาก"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ถึง"
              />
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="pending">รอตรวจสอบ</option>
                <option value="approved">อนุมัติแล้ว</option>
              </select>

              <Button variant="outline" onClick={fetchCompletedTasks}>
                <Filter className="w-4 h-4 mr-1" />
                กรอง
              </Button>
            </div>
          </div>
        </Card>

        {/* Tasks List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/tasks/${task.id}`}>
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                          {task.title}
                        </h3>
                      </Link>
                      <StatusBadge status={task.status} type="task" />
                      <span className="text-sm text-gray-500">#{task.jobNumber}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-700">
                        <Calendar className="w-4 h-4" />
                        <span>เสร็จ: {formatDate(task.completedAt || task.updatedAt)}</span>
                      </div>
                      
                      {task.customerName && (
                        <div className="flex items-center gap-1 text-gray-700">
                          <User className="w-4 h-4" />
                          <span>{task.customerName}</span>
                        </div>
                      )}

                      {task.location && (
                        <div className="flex items-center gap-1 text-gray-700">
                          <MapPin className="w-4 h-4" />
                          <span>{task.location}</span>
                        </div>
                      )}

                      {task.car && (
                        <div className="flex items-center gap-1 text-gray-700">
                          <Car className="w-4 h-4" />
                          <span>{task.car.licensePlate}</span>
                        </div>
                      )}
                    </div>

                    {task.images && task.images.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>มีหลักฐานการทำงาน {task.images.length} รูป</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => openChecklistModal(task)}
                      leftIcon={<FileText className="w-4 h-4" />}
                    >
                      ตรวจสอบ
                    </Button>
                    <Link href={`/tasks/${task.id}`}>
                      <Button size="sm" variant="outline">
                        ดูรายละเอียด
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">ไม่พบงานที่เสร็จสิ้น</p>
              <p className="text-sm">ลองเปลี่ยนตัวกรองหรือช่วงเวลา</p>
            </div>
          </Card>
        )}
      </div>

      {/* Checklist Modal */}
      <Modal
        isOpen={isChecklistModalOpen}
        onClose={() => {
          setIsChecklistModalOpen(false);
          setSelectedTask(null);
        }}
        title="ตรวจสอบงาน"
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* Task Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{selectedTask.title}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div>เลขงาน: {selectedTask.jobNumber}</div>
                <div>ลูกค้า: {selectedTask.customerName || '-'}</div>
                <div>วันที่เสร็จ: {formatDateTime(selectedTask.completedAt || selectedTask.updatedAt)}</div>
                <div>ผู้รับผิดชอบ: {selectedTask.assignments?.length || 0} คน</div>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">รายการตรวจสอบ</h4>
              <div className="space-y-3">
                {checklist.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <label className="flex items-start gap-3 flex-1 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => {
                          const newChecklist = [...checklist];
                          newChecklist[index].checked = e.target.checked;
                          setChecklist(newChecklist);
                        }}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
                      />
                      <div className="flex-1">
                        <span className={`${item.checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                          {item.label}
                        </span>
                      </div>
                      {item.checked && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                หมายเหตุเพิ่มเติม
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="บันทึกข้อสังเกต ปัญหา หรือข้อเสนอแนะ..."
              />
            </div>

            {/* Progress */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  ความคืบหน้า
                </span>
                <span className="text-sm font-medium text-blue-900">
                  {checklist.filter(item => item.checked).length}/{checklist.length}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(checklist.filter(item => item.checked).length / checklist.length) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsChecklistModalOpen(false);
                  setSelectedTask(null);
                }}
              >
                ยกเลิก
              </Button>
              <Button
                className="flex-1"
                onClick={handleApproveTask}
                disabled={!checklist.every(item => item.checked) || isApproving}
                isLoading={isApproving}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                อนุมัติงาน
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
