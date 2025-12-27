'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import { softSpring, quickSpring, scaleIn } from '@/lib/animations';
import type { LucideIcon } from 'lucide-react';

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  badge?: number;
  isCollapsed?: boolean;
  onClick: () => void;
}

// Tooltip component for collapsed state
const Tooltip = memo(function Tooltip({ 
  children, 
  label,
  show 
}: { 
  children: React.ReactNode; 
  label: string;
  show: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <AnimatePresence>
        {show && isHovered && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
              {label}
              {/* Arrow */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export const NavItem = memo(function NavItem({ 
  href, 
  label, 
  icon: Icon, 
  isActive, 
  badge,
  isCollapsed = false,
  onClick 
}: NavItemProps) {
  const content = (
    <Link
      href={href}
      data-nav-item
      className={cn(
        'relative flex items-center h-12 rounded-xl transition-all duration-300 group overflow-hidden',
        isCollapsed ? 'justify-center px-3' : 'justify-between px-4',
        isActive
          ? 'bg-[#EEF2FF] text-[#2D5BFF]'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
      onClick={onClick}
    >
      {/* Active Indicator - Left bar */}
      <motion.div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-[#2D5BFF] rounded-r-full"
        initial={false}
        animate={{ 
          height: isActive ? 24 : 0,
          opacity: isActive ? 1 : 0
        }}
        transition={softSpring}
      />

      <motion.div 
        className={cn(
          'flex items-center',
          isCollapsed ? 'justify-center' : 'space-x-3'
        )}
        layout
      >
        <motion.div
          animate={{ scale: isActive ? 1.1 : 1 }}
          transition={quickSpring}
          className={cn(
            'flex-shrink-0',
            isActive ? 'text-[#2D5BFF]' : 'text-gray-500 group-hover:text-[#2D5BFF]'
          )}
        >
          <Icon className="w-5 h-5" />
        </motion.div>
        
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'font-medium whitespace-nowrap overflow-hidden',
                isActive ? 'text-[#2D5BFF] font-semibold' : ''
              )}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Badge */}
      <AnimatePresence>
        {badge !== undefined && badge > 0 && !isCollapsed && (
          <motion.span 
            {...scaleIn}
            exit={{ scale: 0, opacity: 0 }}
            className="bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-semibold"
          >
            {badge}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge dot when collapsed */}
      <AnimatePresence>
        {badge !== undefined && badge > 0 && isCollapsed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"
          />
        )}
      </AnimatePresence>
    </Link>
  );

  if (isCollapsed) {
    return (
      <li className="relative">
        <Tooltip label={label} show={isCollapsed}>
          {content}
        </Tooltip>
      </li>
    );
  }

  return <li className="relative">{content}</li>;
});
