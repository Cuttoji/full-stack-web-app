'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRoleAccess } from '@/contexts/AuthContext';
import { Button, Card } from '@/components/ui';
import { TaskCard } from '@/components/tasks/TaskCard';
import { CreateTaskForm } from '@/components/tasks/CreateTaskForm';
import { Task, SubUnit, User, Car, CreateTaskRequest } from '@/lib/types';
import { Plus, Search, Filter, Calendar, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function TasksPage() {
  const { isAdmin, isFinance } = useRoleAccess();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [subUnitFilter, setSubUnitFilter] = useState<string>('');

  // Data for forms
  const [subUnits, setSubUnits] = useState<SubUnit[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [cars, setCars] = useState<Car[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTasks = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (subUnitFilter) params.append('subUnitId', subUnitFilter);

      const response = await fetch(`/api/tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTasks(data.data.data);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, subUnitFilter]);

  const fetchFormData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const [subUnitsRes, usersRes, carsRes] = await Promise.all([
        fetch('/api/sub-units', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users?role=TECH', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/cars?status=AVAILABLE', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const subUnitsData = await subUnitsRes.json();
      const usersData = await usersRes.json();
      const carsData = await carsRes.json();

      if (subUnitsData.success) setSubUnits(subUnitsData.data);
      if (usersData.success) setTechnicians(usersData.data.data);
      if (carsData.success) setCars(carsData.data.data);
    } catch (error) {
      console.error('Failed to fetch form data:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchFormData();
  }, [fetchTasks]);

  const handleCreateTask = async (data: CreateTaskRequest) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    fetchTasks();
  };

  // Cancel task
  const handleCancelTask = async (taskId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกงานนี้?')) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      const result = await response.json();
      if (result.success) {
        fetchTasks();
        alert('ยกเลิกงานสำเร็จ');
      }
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  // Delete task (move to trash)
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานนี้? งานจะถูกย้ายไปถังขยะและเก็บไว้ 30 วัน')) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        fetchTasks();
        alert('ย้ายงานไปถังขยะสำเร็จ');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const canCreateTask = isAdmin || isFinance;

  return (
    <DashboardLayout>
      <div className="space-y-6 text-gray-800 mt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการงาน</h1>
            <p className="text-gray-900">ดูและจัดการงานทั้งหมด</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/tasks/trash">
              <Button variant="outline" leftIcon={<Trash2 className="w-4 h-4" />}>
                ถังขยะ
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="outline" leftIcon={<Calendar className="w-4 h-4" />}>
                ปฏิทิน
              </Button>
            </Link>
            {canCreateTask && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                สร้างงานใหม่
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card padding="sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 w-full md:max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-900" />
                <input
                  type="text"
                  placeholder="ค้นหางาน..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ทุกสถานะ</option>
                <option value="WAITING">รอรับงาน</option>
                <option value="IN_PROGRESS">กำลังทำ</option>
                <option value="DONE">จบงาน</option>
                <option value="CANCELLED">ยกเลิก</option>
              </select>

              <select
                value={subUnitFilter}
                onChange={(e) => setSubUnitFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ทุกกลุ่มงาน</option>
                {subUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Tasks List */}
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tasks.length > 0 ? (
          <div className="grid gap-4 grid-cols-1">
            {tasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                compact={true}
                onCancel={handleCancelTask}
                onDelete={handleDeleteTask}
                showActions={canCreateTask}
              />
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12 text-gray-900">
              <Filter className="w-12 h-12 mx-auto mb-4 text-gray-900" />
              <p className="text-lg font-medium">ไม่พบงาน</p>
              <p className="text-sm">ลองเปลี่ยนตัวกรองหรือสร้างงานใหม่</p>
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
            <span className="px-4 py-2 text-gray-900">
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
      </div>

      {/* Create Task Modal */}
      <CreateTaskForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        subUnits={subUnits}
        technicians={technicians}
        cars={cars}
      />
    </DashboardLayout>
  );
}
