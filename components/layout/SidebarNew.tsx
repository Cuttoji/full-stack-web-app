'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useRoleAccess } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { Role, RoleLabels, AuthUser } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { softSpring } from '@/lib/animations';
import { NavItem } from './NavItemNew';
import {
  Home,
  Calendar,
  Users,
  Car,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
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

const FETCH_INTERVAL = 30000;
const SIDEBAR_WIDTH_EXPANDED = 256; // 16rem = 256px
const SIDEBAR_WIDTH_COLLAPSED = 80; // 5rem = 80px

// ============ Sub-components ============
const UserInfo = memo(function UserInfo({ 
  user, 
  isOnline, 
  pendingActions,
  isCollapsed 
}: { 
  user: AuthUser | null; 
  isOnline: boolean; 
  pendingActions: PendingAction[];
  isCollapsed: boolean;
}) {
  return (
    <div className={cn(
      "border-b border-gray-100 transition-all duration-300",
      isCollapsed ? "p-3" : "p-4"
    )}>
      <div className={cn(
        "flex items-center",
        isCollapsed ? "justify-center" : "space-x-3"
      )}>
        <motion.div 
          className="relative flex-shrink-0"
          layout
        >
          <div className={cn(
            "bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] rounded-full flex items-center justify-center text-white font-semibold shadow-lg shadow-[#2D5BFF]/20 transition-all duration-300",
            isCollapsed ? "w-10 h-10 text-sm" : "w-11 h-11"
          )}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          {/* Online indicator */}
          <div className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
            isOnline ? "bg-green-500" : "bg-orange-500"
          )} />
        </motion.div>
        
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div 
              className="flex-1 min-w-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500">{RoleLabels[user?.role as Role]}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status indicators - only show when expanded */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            className="mt-3 flex items-center justify-between"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center space-x-1.5">
              {isOnline ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">ออนไลน์</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs text-orange-600 font-medium">ออฟไลน์</span>
                </>
              )}
            </div>
            {pendingActions.length > 0 && (
              <span className="text-xs text-orange-600 font-medium">
                รอ sync: {pendingActions.length}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const Logo = memo(function Logo({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <Link href="/dashboard" className={cn(
      "flex items-center",
      isCollapsed ? "justify-center" : "space-x-3"
    )}>
      <motion.div 
        className="w-10 h-10 bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] rounded-xl flex items-center justify-center shadow-lg shadow-[#2D5BFF]/20 flex-shrink-0"
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        layout
      >
        <ClipboardList className="w-5 h-5 text-white" />
      </motion.div>
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span 
            className="font-bold text-xl bg-gradient-to-r from-[#2D5BFF] to-[#5C7FFF] bg-clip-text text-transparent whitespace-nowrap"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            TaskFlow
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
});

const CollapseButton = memo(function CollapseButton({
  isCollapsed,
  onClick,
}: {
  isCollapsed: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="absolute -right-3 top-20 z-50 w-6 h-6 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        animate={{ rotate: isCollapsed ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      </motion.div>
    </motion.button>
  );
});

const BottomActions = memo(function BottomActions({
  isCollapsed,
  onLogout,
  onCloseMobile,
}: {
  isCollapsed: boolean;
  onLogout: () => void;
  onCloseMobile: () => void;
}) {
  const handleLogout = useCallback(() => {
    onLogout();
    onCloseMobile();
  }, [onLogout, onCloseMobile]);

  return (
    <div className={cn(
      "border-t border-gray-100",
      isCollapsed ? "p-2" : "p-3"
    )}>
      <button
        onClick={handleLogout}
        className={cn(
          "w-full flex items-center rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 group h-11",
          isCollapsed ? "justify-center px-3" : "space-x-3 px-4"
        )}
      >
        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="whitespace-nowrap overflow-hidden"
            >
              ออกจากระบบ
            </motion.span>
          )}
        </AnimatePresence>
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
      className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-lg border border-gray-100"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative w-6 h-6">
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </motion.div>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <X className="w-6 h-6 text-gray-700" />
        </motion.div>
      </div>
    </motion.button>
  );
});

// ============ Utility ============
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// ============ Custom Hooks ============
function usePendingReports() {
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('/api/tasks?status=DONE&limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (data.success) {
          const pending = data.data.data.filter((task: Task) => !task.approvedAt).length;
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

  return pendingReports;
}

// ============ Main Component ============
export function Sidebar() {
  const { user, logout } = useAuth();
  const { hasRole } = useRoleAccess();
  const { isOnline, pendingActions } = useOffline();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pendingReports = usePendingReports();

  const filteredNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.some((role) => hasRole(role))),
    [hasRole]
  );

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);
  const toggleCollapse = useCallback(() => setIsCollapsed(prev => !prev), []);

  const isActivePath = useCallback((href: string) => 
    pathname === href || pathname.startsWith(`${href}/`), 
    [pathname]
  );

  return (
    <>
      <MobileMenuButton isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileMenu}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside 
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-100 flex-col shadow-sm"
        initial={false}
        animate={{ 
          width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED 
        }}
        transition={softSpring}
      >
        {/* Collapse Button */}
        <CollapseButton isCollapsed={isCollapsed} onClick={toggleCollapse} />

        {/* Logo */}
        <div className={cn(
          "border-b border-gray-100 transition-all duration-300",
          isCollapsed ? "p-3" : "p-4"
        )}>
          <Logo isCollapsed={isCollapsed} />
        </div>

        {/* User Info */}
        <UserInfo 
          user={user} 
          isOnline={isOnline} 
          pendingActions={pendingActions} 
          isCollapsed={isCollapsed}
        />
        
        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <ul className={cn(
            "space-y-1 transition-all duration-300",
            isCollapsed ? "px-2" : "px-3"
          )}>
            {filteredNavItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={isActivePath(item.href)}
                badge={item.href === '/reports' ? pendingReports : undefined}
                isCollapsed={isCollapsed}
                onClick={closeMobileMenu}
              />
            ))}
          </ul>
        </nav>

        {/* Bottom Actions */}
        <BottomActions 
          isCollapsed={isCollapsed}
          onLogout={logout} 
          onCloseMobile={closeMobileMenu} 
        />
      </motion.aside>

      {/* Spacer for main content */}
      <motion.div 
        className="hidden lg:block flex-shrink-0"
        animate={{ 
          width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED 
        }}
        transition={softSpring}
      />

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col shadow-xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={softSpring}
          >
            {/* Logo */}
            <motion.div 
              className="p-4 border-b border-gray-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Logo isCollapsed={false} />
            </motion.div>

            {/* User Info */}
            <UserInfo 
              user={user} 
              isOnline={isOnline} 
              pendingActions={pendingActions}
              isCollapsed={false}
            />
            
            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto">
              <ul className="px-3 space-y-1">
                {filteredNavItems.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <NavItem
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      isActive={isActivePath(item.href)}
                      badge={item.href === '/reports' ? pendingReports : undefined}
                      isCollapsed={false}
                      onClick={closeMobileMenu}
                    />
                  </motion.div>
                ))}
              </ul>
            </nav>

            {/* Bottom Actions */}
            <BottomActions 
              isCollapsed={false}
              onLogout={logout} 
              onCloseMobile={closeMobileMenu} 
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
