'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRoleAccess } from '@/contexts/AuthContext';
import { Button, Card } from '@/components/ui';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Task } from '@/lib/types';
import { Trash2, ArrowLeft, AlertTriangle, Trash } from 'lucide-react';
import Link from 'next/link';

export default function TrashPage() {
  const { isAdmin, isFinance } = useRoleAccess();
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch deleted tasks from API
  const fetchDeletedTasks = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/tasks?trash=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success && result.data?.data) {
        setDeletedTasks(result.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch deleted tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeletedTasks();
  }, [fetchDeletedTasks]);

  // Calculate days remaining before permanent deletion
  const getDaysRemaining = (deletedAt: Date | null | undefined) => {
    if (!deletedAt) return 30;
    const deleteDate = new Date(deletedAt);
    const now = new Date();
    const diffTime = 30 * 24 * 60 * 60 * 1000 - (now.getTime() - deleteDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const handleRestore = async (taskId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deletedAt: null, deletedById: null }),
      });

      const result = await response.json();
      if (result.success) {
        setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
        alert('กู้คืนงานสำเร็จ');
      } else {
        alert(result.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Failed to restore task:', error);
      alert('เกิดข้อผิดพลาดในการกู้คืน');
    }
  };

  const handlePermanentDelete = async (taskId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานนี้อย่างถาวร? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}?permanent=true`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
        alert('ลบงานถาวรสำเร็จ');
      } else {
        alert(result.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Failed to delete task permanently:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานทั้งหมดในถังขยะอย่างถาวร? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Delete all tasks permanently
      await Promise.all(
        deletedTasks.map(task =>
          fetch(`/api/tasks/${task.id}?permanent=true`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setDeletedTasks([]);
      alert('ล้างถังขยะสำเร็จ');
    } catch (error) {
      console.error('Failed to empty trash:', error);
      alert('เกิดข้อผิดพลาดในการล้างถังขยะ');
    }
  };

  const canManageTrash = isAdmin || isFinance;

  return (
    <DashboardLayout>
      <div className="space-y-6 mt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/tasks">
              <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                กลับ
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 dark:text-white">
                <Trash2 className="w-6 h-6 text-red-500" />
                ถังขยะ
              </h1>
              <p className="text-gray-900 dark:text-gray-400">งานที่ถูกลบจะถูกเก็บไว้ 30 วัน ก่อนลบถาวรอัตโนมัติ</p>
            </div>
          </div>
          {canManageTrash && deletedTasks.length > 0 && (
            <Button
              variant="outline"
              onClick={handleEmptyTrash}
              leftIcon={<Trash className="w-4 h-4" />}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              ล้างถังขยะ
            </Button>
          )}
        </div>

        {/* Warning Banner */}
        <Card padding="sm" className="bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              งานในถังขยะจะถูกลบถาวรโดยอัตโนมัติหลังจาก 30 วัน 
              คุณสามารถกู้คืนงานได้ก่อนหมดเวลา
            </p>
          </div>
        </Card>

        {/* Deleted Tasks List */}
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
            ))}
          </div>
        ) : deletedTasks.length > 0 ? (
          <div className="space-y-4">
            {deletedTasks.map((task) => {
              const daysRemaining = getDaysRemaining(task.deletedAt);
              return (
                <div key={task.id} className="relative">
                  {/* Days remaining badge */}
                  <div className={`absolute -top-2 -right-2 z-10 px-2 py-1 rounded-full text-xs font-medium ${
                    daysRemaining <= 7 
                      ? 'bg-red-100 text-red-700' 
                      : daysRemaining <= 14 
                        ? 'bg-amber-100 text-amber-200'
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {daysRemaining <= 0 ? 'กำลังลบ...' : `เหลือ ${daysRemaining} วัน`}
                  </div>
                  
                  <TaskCard
                    task={task}
                    compact={true}
                    isTrashView={true}
                    onRestore={handleRestore}
                    onDelete={handlePermanentDelete}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">ถังขยะว่างเปล่า</p>
              <p className="text-sm mt-1 text-gray-900 dark:text-gray-400">ไม่มีงานที่ถูกลบในขณะนี้</p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
