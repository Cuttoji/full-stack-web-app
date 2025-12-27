'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Calendar, User, type LucideIcon } from 'lucide-react';
import { useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { circleTransition, iconTransition } from '@/lib/animations';

// ============ Types ============
interface NavItemConfig {
  href: string;
  icon: LucideIcon;
  label: string;
}

// ============ Constants ============
const NAV_ITEMS: NavItemConfig[] = [
  { href: '/dashboard', icon: Home, label: 'หน้าหลัก' },
  { href: '/tasks', icon: ClipboardList, label: 'งาน' },
  { href: '/calendar', icon: Calendar, label: 'ปฏิทิน' },
  { href: '/settings', icon: User, label: 'โปรไฟล์' },
];

// ============ Sub-components ============
const FloatingIndicator = memo(function FloatingIndicator({ 
  position, 
  activeIcon: ActiveIcon 
}: { 
  position: number; 
  activeIcon: LucideIcon;
}) {
  return (
    <motion.div
      className="absolute z-20"
      initial={false}
      animate={{ left: `calc(${position}% - 28px)` }}
      transition={circleTransition}
      style={{ top: '-24px' }}
    >
      {/* Curved Holes - White theme */}
      <div 
        className="absolute top-[24px] -left-[20px] w-[20px] h-[40px]"
        style={{
          borderTopRightRadius: '20px',
          boxShadow: '8px -8px 0 8px white',
        }}
      />
      <div 
        className="absolute top-[24px] -right-[20px] w-[20px] h-[40px]"
        style={{
          borderTopLeftRadius: '20px',
          boxShadow: '-8px -8px 0 8px white',
        }}
      />

      {/* Glow Effect */}
      <motion.div 
        className="absolute inset-[-6px] rounded-full bg-[#2D5BFF]/30 blur-xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.8, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Main Circle */}
      <motion.div 
        className="relative w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #2D5BFF 0%, #5C7FFF 100%)',
          boxShadow: '0 8px 32px rgba(45, 91, 255, 0.5), 0 4px 12px rgba(45, 91, 255, 0.3), inset 0 2px 4px rgba(255,255,255,0.3)'
        }}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
      >
        <motion.div
          key={ActiveIcon.displayName}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={iconTransition}
        >
          <ActiveIcon className="w-6 h-6 text-white stroke-[2.5]" />
        </motion.div>
        {/* Shine effect */}
        <div className="absolute top-2 left-3 w-5 h-2.5 bg-white/40 rounded-full blur-[2px]" />
      </motion.div>
    </motion.div>
  );
});

const NavButton = memo(function NavButton({
  href,
  icon: Icon,
  label,
  isActive,
  onClick,
}: NavItemConfig & { isActive: boolean; onClick: () => void }) {
  return (
    <Link
      href={href}
      className="relative flex flex-col items-center justify-center flex-1 group py-2"
      onClick={onClick}
    >
      <motion.div
        className="relative"
        animate={{
          opacity: isActive ? 0 : 1,
          scale: isActive ? 0.5 : 1,
          y: isActive ? -28 : 0,
        }}
        transition={iconTransition}
      >
        <Icon
          className={cn(
            'w-6 h-6 transition-all duration-300',
            isActive
              ? 'text-[#2D5BFF]'
              : 'text-gray-400 group-hover:text-[#2D5BFF] group-active:scale-90'
          )}
        />
      </motion.div>

      <motion.span
        className={cn(
          'text-[10px] mt-1.5 font-medium tracking-wide',
          isActive ? 'text-[#2D5BFF]' : 'text-gray-400 group-hover:text-[#2D5BFF]'
        )}
        animate={{
          opacity: isActive ? 0 : 1,
          y: isActive ? -20 : 0,
        }}
        transition={iconTransition}
      >
        {label}
      </motion.span>

      {/* Spacer when active */}
      {isActive && <div className="h-8" />}
    </Link>
  );
});

// ============ Main Component ============
export function BottomNav() {
  const pathname = usePathname();

  // Derive activeIndex directly from pathname
  const activeIndex = useMemo(() => {
    const index = NAV_ITEMS.findIndex(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    return index !== -1 ? index : 0;
  }, [pathname]);

  const circlePosition = useMemo(() => {
    const itemWidth = 100 / NAV_ITEMS.length;
    return itemWidth * activeIndex + itemWidth / 2;
  }, [activeIndex]);

  const handleNavClick = useCallback(() => {
    // Navigation handled by Next.js Link
  }, []);

  const ActiveIcon = NAV_ITEMS[activeIndex]?.icon;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2">
      {/* Background blur layer */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-100/80 via-gray-50/40 to-transparent pointer-events-none" />
      
      <div className="relative">
        {/* Main Container - White theme matching PC sidebar */}
        <div 
          className="relative bg-white rounded-[24px] overflow-visible pt-5"
          style={{ 
            boxShadow: '0 -4px 24px rgba(0,0,0,0.08), 0 4px 32px rgba(45, 91, 255, 0.1), inset 0 1px 0 rgba(255,255,255,0.9)'
          }}
        >
          {/* Subtle top gradient border */}
          <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#2D5BFF]/20 to-transparent rounded-full" />

          {ActiveIcon && (
            <FloatingIndicator position={circlePosition} activeIcon={ActiveIcon} />
          )}

          <div className="relative flex items-center justify-around pb-6 px-3">
            {NAV_ITEMS.map((item, index) => (
              <NavButton
                key={item.href}
                {...item}
                isActive={index === activeIndex}
                onClick={handleNavClick}
              />
            ))}
          </div>

          {/* Bottom safe area indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-200 rounded-full" />
        </div>
      </div>
    </nav>
  );
}
