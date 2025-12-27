'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useRoleAccess } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { Role, RoleLabels, AuthUser } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { slideFromLeft, fadeInOut, softSpring } from '@/lib/animations';
import { NavItem } from './NavItem';
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
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';

// ============ Types ============
interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

interface PendingAction {
  id: string;
  action: string;
  timestamp: number;
}

interface Task {
  id: string;
  approvedAt?: string | null;
}

// ============ Constants ============
const NAV_ITEMS: NavItemConfig[] = [
  {
    href: '/dashboard',
    label: 'หน้าหลัก',
    icon: Home,
    roles: [Role.ADMIN, Role.FINANCE, Role.SALES, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
  {
    href: '/tasks',
    label: 'จัดการงาน',
    icon: ClipboardList,
    roles: [Role.ADMIN, Role.FINANCE, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
  {
    href: '/calendar',
    label: 'ปฏิทิน',
    icon: Calendar,
    roles: [Role.ADMIN, Role.FINANCE, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
  {
    href: '/leaves',
    label: 'การลา',
    icon: Clock,
    roles: [Role.ADMIN, Role.LEADER, Role.TECH],
  },
  {
    href: '/cars',
    label: 'จัดการรถ',
    icon: Car,
    roles: [Role.ADMIN, Role.HEAD_TECH],
  },
  {
    href: '/users',
    label: 'จัดการผู้ใช้',
    icon: Users,
    roles: [Role.ADMIN],
  },
  {
    href: '/reports',
    label: 'รายงาน',
    icon: FileText,
    roles: [Role.ADMIN, Role.FINANCE, Role.HEAD_TECH, Role.LEADER],
  },
  {
    href: '/settings',
    label: 'ตั้งค่า',
    icon: Settings,
    roles: [Role.ADMIN],
  },
];

const FETCH_INTERVAL = 30000; // 30 seconds

// ============ Sub-components ============
const UserInfo = memo(function UserInfo({ 
  user, 
  isOnline, 
  pendingActions 
}: { 
  user: AuthUser | null; 
  isOnline: boolean; 
  pendingActions: PendingAction[];
}) {
  return (
    <div className="p-4 border-b border-white/20">
      <div className="flex items-center space-x-3">
        <div className="w-11 h-11 bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] rounded-full flex items-center justify-center text-white font-semibold shadow-lg shadow-[#2D5BFF]/30">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
          <p className="text-xs text-gray-600">{RoleLabels[user?.role as Role]}</p>
        </div>
      </div>

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
  );
});

const Logo = memo(function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center space-x-2">
      <motion.div 
        className="w-10 h-10 bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] rounded-xl flex items-center justify-center shadow-lg shadow-[#2D5BFF]/30"
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <ClipboardList className="w-6 h-6 text-white" />
      </motion.div>
      <span className="font-bold text-xl bg-gradient-to-r from-[#2D5BFF] to-[#5C7FFF] bg-clip-text text-transparent">
        TaskFlow
      </span>
    </Link>
  );
});

const BottomActions = memo(function BottomActions({
  notifications,
  onLogout,
  onCloseMobile,
}: {
  notifications: number;
  onLogout: () => void;
  onCloseMobile: () => void;
}) {
  const handleLogout = useCallback(() => {
    onLogout();
    onCloseMobile();
  }, [onLogout, onCloseMobile]);

  return (
    <div className="p-4 border-t border-white/20 space-y-1">
      <Link
        href="/notifications"
        className="relative flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-600 hover:bg-white/50 hover:backdrop-blur-md hover:text-gray-900 transition-all duration-200 group"
        onClick={onCloseMobile}
      >
        <div className="flex items-center space-x-3">
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          <span>การแจ้งเตือน</span>
        </div>
        {notifications > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold shadow-lg shadow-red-500/30"
          >
            {notifications}
          </motion.span>
        )}
      </Link>
      <button
        onClick={handleLogout}
        className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50/50 hover:backdrop-blur-md transition-all duration-200 group"
      >
        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
        <span>ออกจากระบบ</span>
      </button>
    </div>
  );
});

const MobileMenuButton = memo(function MobileMenuButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white/70 backdrop-blur-md rounded-xl shadow-glass border border-white/20"
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative w-6 h-6">
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <Menu className="w-6 h-6 text-gray-900" />
        </motion.div>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <X className="w-6 h-6 text-gray-900" />
        </motion.div>
      </div>
    </motion.button>
  );
});

// ============ Custom Hooks ============
function useNotifications() {
  const [notifications, setNotifications] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const [notifRes, reportsRes] = await Promise.all([
          fetch('/api/notifications?unreadOnly=true', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/tasks?status=DONE&limit=100', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const [notifData, reportsData] = await Promise.all([
          notifRes.json(),
          reportsRes.json(),
        ]);

        if (notifData.success) {
          setNotifications(notifData.data.unreadCount);
        }
        if (reportsData.success) {
          const pending = reportsData.data.data.filter((task: Task) => !task.approvedAt).length;
          setPendingReports(pending);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return { notifications, pendingReports };
}

// ============ Main Component ============
export function Sidebar() {
  const { user, logout } = useAuth();
  const { hasRole } = useRoleAccess();
  const { isOnline, pendingActions } = useOffline();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { notifications, pendingReports } = useNotifications();

  const filteredNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.some((role) => hasRole(role))),
    [hasRole]
  );

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);

  const isActivePath = useCallback((href: string) => 
    pathname === href || pathname.startsWith(`${href}/`), 
    [pathname]
  );

  const NavContent = useMemo(() => (
    <>
      <UserInfo user={user} isOnline={isOnline} pendingActions={pendingActions} />
      
      <nav className="relative flex-1 py-4 overflow-y-auto">
        <ul className="relative z-10 px-4 space-y-1">
          {filteredNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={isActivePath(item.href)}
              badge={item.href === '/reports' ? pendingReports : undefined}
              onClick={closeMobileMenu}
            />
          ))}
        </ul>
      </nav>

      <BottomActions 
        notifications={notifications} 
        onLogout={logout} 
        onCloseMobile={closeMobileMenu} 
      />
    </>
  ), [user, isOnline, pendingActions, filteredNavItems, isActivePath, pendingReports, notifications, logout, closeMobileMenu]);

  return (
    <>
      <MobileMenuButton isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            {...fadeInOut}
            onClick={closeMobileMenu}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white/70 backdrop-blur-xl border-r border-white/20 flex-col shadow-glass">
        <div className="p-4 border-b border-white/20">
          <Logo />
        </div>
        {NavContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white/70 backdrop-blur-xl border-r border-white/20 flex flex-col shadow-glass"
            {...slideFromLeft}
            transition={softSpring}
          >
            <motion.div 
              className="p-4 border-b border-white/20"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Logo />
            </motion.div>
            {NavContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
