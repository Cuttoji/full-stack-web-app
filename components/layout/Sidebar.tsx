'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useRoleAccess } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { Role, RoleLabels } from '@/lib/types';
import { cn } from '@/lib/cn';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useState, useEffect, useMemo } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  roles: Role[];
}

const navItems: NavItem[] = [
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

export function Sidebar() {
  const { user, logout } = useAuth();
  const { hasRole } = useRoleAccess();
  const { isOnline, pendingActions } = useOffline();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<number>(0);
  const [pendingReports, setPendingReports] = useState<number>(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Memoize filtered nav items to prevent infinite loop
  const filteredNavItems = useMemo(
    () => navItems.filter((item) => item.roles.some((role) => hasRole(role))),
    [hasRole]
  );

  // Find active index based on pathname
  useEffect(() => {
    const index = filteredNavItems.findIndex(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [pathname, filteredNavItems, activeIndex]);

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
      <nav className="relative flex-1 py-4 overflow-y-auto">
        {/* Menu Items */}
        <ul className="relative z-10 px-4 space-y-1">
          {filteredNavItems.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const showBadge = item.href === '/reports' && pendingReports > 0;
            const Icon = item.icon;
            
            return (
              <li key={item.href} className="relative">
                {/* Framer Motion Indicator - Desktop Only */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="hidden lg:block absolute inset-0 -left-4 -right-4"
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 350,
                      damping: 30,
                    }}
                  >
                    {/* Main Indicator Bar */}
                    <div 
                      className="absolute right-0 w-[calc(100%+16px)] h-full bg-white rounded-l-[28px]"
                      style={{
                        boxShadow: '0 4px 20px rgba(45, 91, 255, 0.15)',
                      }}
                    />
                    
                    {/* Top Curved Hole */}
                    <div 
                      className="absolute -top-[28px] right-0 w-[28px] h-[28px]"
                      style={{
                        background: 'transparent',
                        borderBottomRightRadius: '28px',
                        boxShadow: '12px 12px 0 12px white',
                      }}
                    />
                    
                    {/* Bottom Curved Hole */}
                    <div 
                      className="absolute -bottom-[28px] right-0 w-[28px] h-[28px]"
                      style={{
                        background: 'transparent',
                        borderTopRightRadius: '28px',
                        boxShadow: '12px -12px 0 12px white',
                      }}
                    />
                    
                    {/* Blue accent line on the left edge */}
                    <motion.div 
                      className="absolute left-6 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gradient-to-b from-[#2D5BFF] to-[#5C7FFF]"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.1, duration: 0.2 }}
                    />
                  </motion.div>
                )}

                <Link
                  href={item.href}
                  data-nav-item
                  className={cn(
                    'relative flex items-center justify-between h-14 px-3 rounded-xl transition-all duration-300 group z-10',
                    isActive
                      ? 'lg:bg-transparent text-white bg-gradient-to-r from-[#2D5BFF] to-[#5C7FFF] lg:from-transparent lg:to-transparent shadow-lg lg:shadow-none shadow-[#2D5BFF]/30'
                      : 'text-gray-600 hover:bg-white/50 hover:backdrop-blur-md hover:text-gray-900'
                  )}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setActiveIndex(index);
                  }}
                >
                  <motion.div 
                    className="flex items-center space-x-3"
                    animate={isActive ? { x: 4 } : { x: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <motion.div
                      animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={cn(
                        'transition-colors duration-300',
                        isActive 
                          ? 'lg:text-[#2D5BFF] text-white' 
                          : 'group-hover:text-[#2D5BFF]'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>
                    <span className={cn(
                      'font-medium transition-all duration-300',
                      isActive 
                        ? 'lg:text-[#2D5BFF] lg:font-bold text-white' 
                        : ''
                    )}>
                      {item.label}
                    </span>
                  </motion.div>
                  {showBadge && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-lg shadow-red-500/30"
                    >
                      {pendingReports}
                    </motion.span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/20 space-y-1">
        <Link
          href="/notifications"
          className="relative flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-600 hover:bg-white/50 hover:backdrop-blur-md hover:text-gray-900 transition-all duration-200 group"
          onClick={() => setIsMobileMenuOpen(false)}
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
          onClick={() => {
            logout();
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50/50 hover:backdrop-blur-md transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <motion.button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white/70 backdrop-blur-md rounded-xl shadow-glass border border-white/20"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative w-6 h-6">
          <motion.div
            animate={isMobileMenuOpen ? { rotate: 90, opacity: 0 } : { rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <Menu className="w-6 h-6 text-gray-900" />
          </motion.div>
          <motion.div
            animate={isMobileMenuOpen ? { rotate: 0, opacity: 1 } : { rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <X className="w-6 h-6 text-gray-900" />
          </motion.div>
        </div>
      </motion.button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop (always visible) */}
      <aside className="hidden lg:flex fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white/70 backdrop-blur-xl border-r border-white/20 flex-col shadow-glass">
        {/* Logo */}
        <div className="p-4 border-b border-white/20">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <motion.div 
              className="w-10 h-10 bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] rounded-xl flex items-center justify-center shadow-lg shadow-[#2D5BFF]/30"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <ClipboardList className="w-6 h-6 text-white" />
            </motion.div>
            <span className="font-bold text-xl bg-gradient-to-r from-[#2D5BFF] to-[#5C7FFF] bg-clip-text text-transparent">TaskFlow</span>
          </Link>
        </div>
        <NavContent />
      </aside>

      {/* Sidebar - Mobile (animated) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white/70 backdrop-blur-xl border-r border-white/20 flex flex-col shadow-glass"
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Logo */}
            <motion.div 
              className="p-4 border-b border-white/20"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] rounded-xl flex items-center justify-center shadow-lg shadow-[#2D5BFF]/30">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl bg-gradient-to-r from-[#2D5BFF] to-[#5C7FFF] bg-clip-text text-transparent">TaskFlow</span>
              </Link>
            </motion.div>
            <NavContent />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
