'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRoleAccess } from '@/contexts/AuthContext';
import { Button, Card, Modal, StatusBadge } from '@/components/ui';
import { Task, TaskStatus, SubUnit, User, Car, CreateTaskRequest } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import { CreateTaskForm } from '@/components/tasks/CreateTaskForm';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';

// Calendar helpers
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateString: string;
  tasks: Task[];
}

export default function CalendarPage() {
  const { isAdmin, isFinance } = useRoleAccess();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [subUnits, setSubUnits] = useState<SubUnit[]>([]);
  const [selectedSubUnit, setSelectedSubUnit] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [cars, setCars] = useState<Car[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchTasks = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsLoading(true);
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        limit: '100',
      });

      if (selectedSubUnit) {
        params.append('subUnitId', selectedSubUnit);
      }

      const response = await fetch(`/api/tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error('Failed to fetch tasks:', response.status);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setTasks(data.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, selectedSubUnit]);

  const fetchSubUnits = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/sub-units', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error('Failed to fetch sub-units:', response.status);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSubUnits(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sub-units:', error);
    }
  };

  const fetchTechnicians = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/users?role=TECH,HEAD_TECH,LEADER&limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error('Failed to fetch technicians:', response.status);
        return;
      }

      const data = await response.json();
      console.log('Technicians data:', data);
      if (data.success) {
        setTechnicians(data.data.data || []);
        console.log('Technicians set:', data.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
    }
  };

  const fetchCars = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/cars', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error('Failed to fetch cars:', response.status);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setCars(data.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch cars:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchSubUnits();
    fetchTechnicians();
    fetchCars();
  }, [fetchTasks]);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: CalendarDay[] = [];
    const today = new Date();

    // Previous month days
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = prevMonthDays - i;
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        dateString,
        tasks: [],
      });
    }

    // Current month days
    for (let date = 1; date <= daysInMonth; date++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === date;

      const dayTasks = tasks.filter((task) => {
        const taskDate = new Date(task.scheduledDate);
        return (
          taskDate.getFullYear() === year &&
          taskDate.getMonth() === month &&
          taskDate.getDate() === date
        );
      });

      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        dateString,
        tasks: dayTasks,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let date = 1; date <= remainingDays; date++) {
      const dateString = `${year}-${String(month + 2).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        dateString,
        tasks: [],
      });
    }

    return days;
  }, [year, month, tasks]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateTask = async (data: CreateTaskRequest) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const result = await response.json();
      if (result.success) {
        // Refresh tasks
        fetchTasks();
        setIsCreateModalOpen(false);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.WAITING:
        return 'bg-yellow-500';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-500';
      case TaskStatus.DONE:
        return 'bg-green-500';
      case TaskStatus.CANCELLED:
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-gray-800">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ปฏิทินงาน</h1>
            <p className="text-gray-500">ดูตารางงานในรูปแบบปฏิทิน</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/tasks">
              <Button variant="outline">ดูรายการ</Button>
            </Link>
            {(isAdmin || isFinance) && (
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                สร้างงานใหม่
              </Button>
            )}
          </div>
        </div>

        {/* Calendar Controls */}
        <Card padding="sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[160px] text-center">
                {MONTHS[month]} {year + 543}
              </h2>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday}>
                วันนี้
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedSubUnit}
                onChange={(e) => setSelectedSubUnit(e.target.value)}
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

        {/* Calendar Grid */}
        <Card padding="none">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((day, index) => (
              <div
                key={day}
                className={`py-3 text-center text-sm font-medium ${
                  index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div
                key={`${day.dateString}-${index}`}
                onClick={() => day.isCurrentMonth && setSelectedDay(day)}
                className={`min-h-[100px] p-2 border-b border-r cursor-pointer transition-colors ${
                  day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                } ${day.isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    !day.isCurrentMonth
                      ? 'text-gray-300'
                      : day.isToday
                      ? 'text-blue-600'
                      : index % 7 === 0
                      ? 'text-red-500'
                      : index % 7 === 6
                      ? 'text-blue-500'
                      : 'text-gray-900'
                  }`}
                >
                  {day.date}
                </div>

                {day.isCurrentMonth && day.tasks.length > 0 && (
                  <div className="space-y-1">
                    {day.tasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-1 text-xs"
                      >
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
                        <span className="truncate flex-1">{task.title}</span>
                      </div>
                    ))}
                    {day.tasks.length > 3 && (
                      <p className="text-xs text-gray-500">+{day.tasks.length - 3} งาน</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Legend */}
        <Card padding="sm">
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-gray-700">สถานะ:</span>
            {Object.values(TaskStatus).map((status) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                <span className="text-sm text-gray-600">{STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Day Detail Modal */}
      <Modal
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `งานวันที่ ${selectedDay.date} ${MONTHS[month]} ${year + 543}` : ''}
        size="lg"
      >
        {selectedDay && (
          <div className="space-y-4">
            {selectedDay.tasks.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {selectedDay.tasks.map((task) => (
                  <Link key={task.id} href={`/tasks/${task.id}`}>
                    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 truncate">
                              {task.title}
                            </h3>
                            <StatusBadge status={task.status} type="task" />
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            {task.startTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {task.startTime} - {task.endTime}
                              </span>
                            )}
                            {task.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {task.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>ไม่มีงานในวันนี้</p>
              </div>
            )}

            {(isAdmin || isFinance) && (
              <div className="pt-4 border-t">
                <Button 
                  className="w-full" 
                  onClick={() => setIsCreateModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  สร้างงานใหม่
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

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
