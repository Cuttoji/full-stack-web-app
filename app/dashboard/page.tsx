'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth, useRoleAccess } from '@/contexts/AuthContext';
import { StatCard, Card, CardHeader } from '@/components/ui';
import { TaskCard } from '@/components/tasks/TaskCard';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  Calendar,
  Car,
  Users,
  TrendingUp,
} from 'lucide-react';
import { DashboardStats, LeaderDashboardStats, Task } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isAdmin, isFinance, isHeadTech, isLeader, isTech } = useRoleAccess();
  const [stats, setStats] = useState<DashboardStats | LeaderDashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const [statsRes, tasksRes] = await Promise.all([
          fetch('/api/dashboard', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/tasks?limit=5', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const statsData = await statsRes.json();
        const tasksData = await tasksRes.json();

        if (statsData.success) setStats(statsData.data);
        if (tasksData.success) setRecentTasks(tasksData.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'สวัสดีตอนเช้า';
    if (hour < 17) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-gray-800 mt-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.name}!
          </h1>
          <p className="text-gray-900">นี่คือภาพรวมของวันนี้</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="งานทั้งหมด"
            value={stats?.totalTasks || 0}
            icon={<ClipboardList className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="รอรับงาน"
            value={stats?.waitingTasks || 0}
            icon={<Clock className="w-6 h-6" />}
            color="gray"
          />
          <StatCard
            title="กำลังทำ"
            value={stats?.inProgressTasks || 0}
            icon={<TrendingUp className="w-6 h-6" />}
            color="yellow"
          />
          <StatCard
            title="จบงานแล้ว"
            value={stats?.completedTasks || 0}
            icon={<CheckCircle className="w-6 h-6" />}
            color="green"
          />
        </div>

        {/* Additional Stats for specific roles */}
        {(isAdmin || isHeadTech) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="รถพร้อมใช้"
              value={stats?.availableCars || 0}
              icon={<Car className="w-6 h-6" />}
              color="purple"
            />
            <StatCard
              title="งานวันนี้"
              value={stats?.todayTasks || 0}
              icon={<Calendar className="w-6 h-6" />}
              color="blue"
            />
            <StatCard
              title="รอนุมัติลา"
              value={stats?.pendingLeaves || 0}
              icon={<Users className="w-6 h-6" />}
              color="yellow"
            />
          </div>
        )}

        {/* Leader specific stats */}
        {isLeader && (stats as LeaderDashboardStats)?.teamMembersCount !== undefined && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="สมาชิกในทีม"
              value={(stats as LeaderDashboardStats).teamMembersCount}
              icon={<Users className="w-6 h-6" />}
              color="blue"
            />
            <StatCard
              title="ลาวันนี้"
              value={(stats as LeaderDashboardStats).teamOnLeaveToday}
              icon={<Calendar className="w-6 h-6" />}
              color="yellow"
            />
            <StatCard
              title="รออนุมัติลา"
              value={(stats as LeaderDashboardStats).pendingLeaveRequests}
              icon={<Clock className="w-6 h-6" />}
              color="red"
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 ">
          {/* Important Announcements */}
          <div className="lg:col-span-2 ">
            <Card>
              <CardHeader
                title="ประกาศสำคัญ"
                action={
                  <Link
                    href="/notifications"
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    ดูทั้งหมด →
                  </Link>
                }
              />
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                  <h4 className="font-semibold text-blue-800">📢 ประชุมประจำเดือน</h4>
                  <p className="text-sm text-blue-700 mt-1">วันที่ 2 มกราคม 2568 เวลา 09:00 น. ห้องประชุมใหญ่</p>
                </div>
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
                  <h4 className="font-semibold text-yellow-800">⚠️ ปิดปรับปรุงระบบ</h4>
                  <p className="text-sm text-yellow-700 mt-1">วันที่ 31 ธันวาคม 2567 เวลา 22:00 - 06:00 น.</p>
                </div>
                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                  <h4 className="font-semibold text-green-800">🎉 วันหยุดปีใหม่</h4>
                  <p className="text-sm text-green-700 mt-1">วันที่ 1-3 มกราคม 2568 หยุดราชการ</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            {/* Quick Actions Card */}
            <Card>
              <CardHeader title="การดำเนินการด่วน" />
              <div className="space-y-2">
                {(isAdmin || isFinance) && (
                  <Link
                    href="/tasks/new"
                    className="flex items-center p-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <ClipboardList className="w-5 h-5 mr-3" />
                    <span className="font-medium">สร้างงานใหม่</span>
                  </Link>
                )}
                <Link
                  href="/calendar"
                  className="flex items-center p-3 bg-green-50 rounded-lg text-green-700 hover:bg-green-100 transition-colors"
                >
                  <Calendar className="w-5 h-5 mr-3" />
                  <span className="font-medium">ดูปฏิทิน</span>
                </Link>
                <Link
                  href="/leaves"
                  className="flex items-center p-3 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors"
                >
                  <Clock className="w-5 h-5 mr-3" />
                  <span className="font-medium">ลางาน</span>
                </Link>
                {(isAdmin || isHeadTech) && (
                  <Link
                    href="/cars"
                    className="flex items-center p-3 bg-orange-50 rounded-lg text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    <Car className="w-5 h-5 mr-3" />
                    <span className="font-medium">จัดการรถ</span>
                  </Link>
                )}
              </div>
            </Card>

            {/* Today's Schedule */}
            <Card>
              <CardHeader title="กำหนดการวันนี้" />
              <div className="text-center py-6 text-gray-900">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-900" />
                <p className="text-sm">
                  {stats?.todayTasks || 0} งานวันนี้
                </p>
                <Link
                  href="/calendar"
                  className="text-blue-600 text-sm hover:underline mt-2 inline-block"
                >
                  ดูรายละเอียด
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
