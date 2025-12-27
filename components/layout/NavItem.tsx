'use client';

import { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { softSpring, quickSpring, scaleIn } from '@/lib/animations';
import { SidebarIndicator } from './SidebarIndicator';
import type { LucideIcon } from 'lucide-react';

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
}

export const NavItem = memo(function NavItem({ 
  href, 
  label, 
  icon: Icon, 
  isActive, 
  badge,
  onClick 
}: NavItemProps) {
  return (
    <li className="relative">
      <SidebarIndicator isVisible={isActive} />

      <Link
        href={href}
        data-nav-item
        className={cn(
          'relative flex items-center justify-between h-14 px-3 rounded-xl transition-all duration-300 group z-10',
          isActive
            ? 'lg:bg-transparent text-white bg-gradient-to-r from-[#2D5BFF] to-[#5C7FFF] lg:from-transparent lg:to-transparent shadow-lg lg:shadow-none shadow-[#2D5BFF]/30'
            : 'text-gray-600 hover:bg-white/50 hover:backdrop-blur-md hover:text-gray-900'
        )}
        onClick={onClick}
      >
        <motion.div 
          className="flex items-center space-x-3"
          animate={{ x: isActive ? 4 : 0 }}
          transition={softSpring}
        >
          <motion.div
            animate={{ scale: isActive ? 1.1 : 1 }}
            transition={quickSpring}
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
            {label}
          </span>
        </motion.div>
        
        {badge !== undefined && badge > 0 && (
          <motion.span 
            {...scaleIn}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-lg shadow-red-500/30"
          >
            {badge}
          </motion.span>
        )}
      </Link>
    </li>
  );
});
