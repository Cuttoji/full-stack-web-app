'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useRoleAccess } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { Role, RoleLabels, AuthUser } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { slideFromLeft, fadeInOut, softSpring } from '@/lib/animations';
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
  WifiOff,
  CheckCircle,
  Clock,
  ClipboardList,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { cn } from '@/lib/cn';

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
    roles: [Role.ADMIN, Role.CUSTOMER_SERVICE, Role.FINANCE_LEADER, Role.FINANCE, Role.SALES_LEADER, Role.SALES, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
  {
    href: '/tasks',
    label: 'จัดการงาน',
    icon: ClipboardList,
    roles: [Role.ADMIN, Role.CUSTOMER_SERVICE, Role.FINANCE_LEADER, Role.FINANCE, Role.SALES_LEADER, Role.SALES, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
  {
    href: '/calendar',
    label: 'ปฏิทิน',
    icon: Calendar,
    roles: [Role.ADMIN, Role.CUSTOMER_SERVICE, Role.FINANCE_LEADER, Role.FINANCE, Role.SALES_LEADER, Role.SALES, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
  {
    href: '/leaves',
    label: 'การลา',
    icon: Clock,
    roles: [Role.ADMIN, Role.CUSTOMER_SERVICE, Role.FINANCE_LEADER, Role.FINANCE, Role.SALES_LEADER, Role.SALES, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
  {
    href: '/cars',
    label: 'จัดการรถ',
    icon: Car,
    roles: [Role.ADMIN, Role.HEAD_TECH, Role.LEADER],
  },
  {
    href: '/users',
    label: 'จัดการผู้ใช้',
    icon: Users,
    roles: [Role.ADMIN, Role.FINANCE_LEADER, Role.SALES_LEADER, Role.HEAD_TECH],
  },
  {
    href: '/reports',
    label: 'รายงาน',
    icon: FileText,
    roles: [Role.ADMIN, Role.CUSTOMER_SERVICE, Role.FINANCE_LEADER, Role.FINANCE, Role.LEADER],
  },
  {
    href: '/settings',
    label: 'ตั้งค่า',
    icon: Settings,
    roles: [Role.ADMIN, Role.CUSTOMER_SERVICE, Role.FINANCE_LEADER, Role.FINANCE, Role.SALES_LEADER, Role.SALES, Role.HEAD_TECH, Role.LEADER, Role.TECH],
  },
];

const FETCH_INTERVAL = 30000;
const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 72;

// ============ Sub-components ============
const UserInfo = memo(function UserInfo({ 
  user, 
  isOnline, 
  pendingActions,
  isCollapsed,
}: { 
  user: AuthUser | null; 
  isOnline: boolean; 
  pendingActions: PendingAction[];
  isCollapsed: boolean;
}) {
  return (
    <div className={cn(
      "border-b border-gray-100 dark:border-slate-700 transition-all duration-300",
      isCollapsed ? "p-3" : "p-4"
    )}>
      <div className={cn(
        "flex items-center",
        isCollapsed ? "justify-center" : "space-x-3"
      )}>
        <div className="relative flex-shrink-0">
          <div className={cn(
            "bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] rounded-full flex items-center justify-center text-white font-semibold shadow-lg shadow-[#2D5BFF]/20 transition-all duration-300",
            isCollapsed ? "w-10 h-10 text-sm" : "w-11 h-11"
          )}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800",
            isOnline ? "bg-green-500" : "bg-orange-500"
          )} />
        </div>
        
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div 
              className="flex-1 min-w-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{RoleLabels[user?.role as Role]}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
      className="absolute -right-3 top-6 z-50 w-6 h-6 bg-white dark:bg-slate-700 rounded-full shadow-md border border-gray-200 dark:border-slate-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-600 hover:shadow-lg transition-all duration-200"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        animate={{ rotate: isCollapsed ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </motion.div>
    </motion.button>
  );
});

const NavItem = memo(function NavItem({ 
  href, 
  label, 
  icon: Icon, 
  isActive, 
  badge,
  isCollapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  badge?: number;
  isCollapsed: boolean;
  onClick: () => void;
}) {
  return (
    <li className="relative">
      {/* Active Indicator */}
      {isActive && (
        <motion.div
          layoutId="sidebar-indicator"
          className={cn(
            "hidden lg:block absolute inset-0",
            isCollapsed ? "-left-2 -right-2" : "-left-3 -right-0"
          )}
          initial={false}
          transition={softSpring}
        >
          <div className={cn(
            "absolute right-0 h-full bg-blue-50 dark:bg-blue-900/30 border-l-4 border-[#2D5BFF]",
            isCollapsed ? "w-[calc(100%+16px)] rounded-l-xl" : "w-[calc(100%+12px)] rounded-l-2xl"
          )} />
          
          {!isCollapsed && (
            <>
              <div 
                className="absolute -top-5 right-0 w-5 h-5"
                style={{
                  background: 'transparent',
                  borderBottomRightRadius: '20px',
                  boxShadow: '8px 8px 0 8px rgb(239 246 255)',
                }}
              />
              <div 
                className="absolute -bottom-5 right-0 w-5 h-5"
                style={{
                  background: 'transparent',
                  borderTopRightRadius: '20px',
                  boxShadow: '8px -8px 0 8px rgb(239 246 255)',
                }}
              />
            </>
          )}
        </motion.div>
      )}

      <Link
        href={href}
        className={cn(
          "relative flex items-center h-12 rounded-xl transition-all duration-300 group z-10",
          isCollapsed ? "justify-center px-2" : "justify-between px-3",
          isActive
            ? 'text-[#2D5BFF] dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
        )}
        onClick={onClick}
        title={isCollapsed ? label : undefined}
      >
        <div className={cn(
          "flex items-center",
          isCollapsed ? "" : "space-x-3"
        )}>
          <motion.div
            animate={{ scale: isActive ? 1.1 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Icon className="w-5 h-5" />
          </motion.div>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                className={cn(
                  "font-medium whitespace-nowrap",
                  isActive ? "font-bold" : ""
                )}
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        {!isCollapsed && badge !== undefined && badge > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-lg shadow-red-500/30"
          >
            {badge}
          </motion.span>
        )}
        
        {isCollapsed && badge !== undefined && badge > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold"
          >
            {badge > 9 ? '9+' : badge}
          </motion.span>
        )}
      </Link>
    </li>
  );
});

const BottomActions = memo(function BottomActions({
  isCollapsed,
  onLogout,
  onCloseMobile,
}: {
  notifications: number;
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
      "border-t border-gray-100 dark:border-slate-700",
      isCollapsed ? "p-2" : "p-3"
    )}>
      
      <button
        onClick={handleLogout}
        className={cn(
          "w-full flex items-center rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 group h-11",
          isCollapsed ? "justify-center px-2" : "space-x-3 px-3"
        )}
        title={isCollapsed ? "ออกจากระบบ" : undefined}
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
      className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700"
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
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </motion.div>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
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
  const [isCollapsed, setIsCollapsed] = useState(true); // เริ่มต้นย่อไว้
  const { notifications, pendingReports } = useNotifications();

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
            {...fadeInOut}
            onClick={closeMobileMenu}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside 
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 flex-col shadow-sm"
        initial={false}
        animate={{ 
          width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED 
        }}
        transition={softSpring}
      >
        <CollapseButton isCollapsed={isCollapsed} onClick={toggleCollapse} />
        
        <UserInfo 
          user={user} 
          isOnline={isOnline} 
          pendingActions={pendingActions}
          isCollapsed={isCollapsed}
        />
        
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

        <BottomActions 
          notifications={notifications}
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

      {/* Mobile Sidebar - Always expanded */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 flex flex-col shadow-xl"
            {...slideFromLeft}
            transition={softSpring}
          >
            <UserInfo 
              user={user} 
              isOnline={isOnline} 
              pendingActions={pendingActions}
              isCollapsed={false}
            />
            
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

            <BottomActions 
              notifications={notifications}
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
