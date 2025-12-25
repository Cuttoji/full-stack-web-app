'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useRoleAccess } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { Role, RoleLabels } from '@/lib/types';
import {
  Home,
  Calendar,
  Users,
  Car,
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  WifiOff,
  CheckCircle,
  Clock,
  ClipboardList,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'หน้าหลัก',
    icon: <Home className="w-5 h-5" />,
    roles: [Role.ADMIN, Role.FINANCE, Role.SALES, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
  {
    href: '/tasks',
    label: 'จัดการงาน',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: [Role.ADMIN, Role.FINANCE, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
  {
    href: '/calendar',
    label: 'ปฏิทิน',
    icon: <Calendar className="w-5 h-5" />,
    roles: [Role.ADMIN, Role.FINANCE, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
  {
    href: '/leaves',
    label: 'การลา',
    icon: <Clock className="w-5 h-5" />,
    roles: [Role.ADMIN, Role.LEADER, Role.TECH],
  },
  {
    href: '/cars',
    label: 'จัดการรถ',
    icon: <Car className="w-5 h-5" />,
    roles: [Role.ADMIN, Role.HEAD_TECH],
  },
  {
    href: '/users',
    label: 'จัดการผู้ใช้',
    icon: <Users className="w-5 h-5" />,
    roles: [Role.ADMIN],
  },
  {
    href: '/reports',
    label: 'รายงาน',
    icon: <FileText className="w-5 h-5" />,
    roles: [Role.ADMIN, Role.FINANCE, Role.HEAD_TECH, Role.LEADER],
  },
  {
    href: '/settings',
    label: 'ตั้งค่า',
    icon: <Settings className="w-5 h-5" />,
    roles: [Role.ADMIN],
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { hasRole } = useRoleAccess();
  const { isOnline, pendingActions } = useOffline();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<number>(0);
  const [pendingReports, setPendingReports] = useState<number>(0);

  const filteredNavItems = navItems.filter((item) =>
    item.roles.some((role) => hasRole(role))
  );

  useEffect(() => {
    // Fetch notification count
    const fetchNotifications = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('/api/notifications?unreadOnly=true', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data.unreadCount);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    // Fetch pending reports count
    const fetchPendingReports = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('/api/tasks?status=DONE&limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          // Count tasks that need approval (no completedAt means pending review)
          const pending = data.data.data.filter((task: any) => !task.approvedAt).length;
          setPendingReports(pending);
        }
      } catch (error) {
        console.error('Failed to fetch pending reports:', error);
      }
    };

    fetchNotifications();
    fetchPendingReports();
    
    const interval = setInterval(() => {
      fetchNotifications();
      fetchPendingReports();
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const NavContent = () => (
    <>
      {/* User Info */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] rounded-full flex items-center justify-center text-white font-semibold shadow-lg shadow-[#2D5BFF]/30">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-900">{RoleLabels[user?.role as Role]}</p>
          </div>
        </div>

        {/* Online/Offline Status */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {isOnline ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600">ออนไลน์</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-orange-600">ออฟไลน์</span>
              </>
            )}
          </div>
          {pendingActions.length > 0 && (
            <span className="text-xs text-orange-600">
              รอ sync: {pendingActions.length}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const showBadge = item.href === '/reports' && pendingReports > 0;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-[#2D5BFF] to-[#5C7FFF] text-white font-semibold shadow-lg shadow-[#2D5BFF]/30'
                  : 'text-gray-900 hover:bg-white/50 hover:backdrop-blur-md'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {showBadge && (
                <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-lg shadow-red-500/30">
                  {pendingReports}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/20 space-y-1">
        <Link
          href="/notifications"
          className="flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-900 hover:bg-white/50 hover:backdrop-blur-md transition-all duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5" />
            <span>การแจ้งเตือน</span>
          </div>
          {notifications > 0 && (
            <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold shadow-lg shadow-red-500/30">
              {notifications}
            </span>
          )}
        </Link>
        <button
          onClick={() => {
            logout();
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50/50 hover:backdrop-blur-md transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white/70 backdrop-blur-md rounded-xl shadow-glass border border-white/20"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-900" />
        ) : (
          <Menu className="w-6 h-6 text-gray-900" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white/70 backdrop-blur-xl border-r border-white/20 flex flex-col transform transition-transform duration-200 ease-in-out shadow-glass ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/20">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] rounded-xl flex items-center justify-center shadow-lg shadow-[#2D5BFF]/30">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-[#2D5BFF] to-[#5C7FFF] bg-clip-text text-transparent">TaskFlow</span>
          </Link>
        </div>

        <NavContent />
      </aside>
    </>
  );
}
