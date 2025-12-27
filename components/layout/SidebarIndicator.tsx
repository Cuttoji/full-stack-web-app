'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { quickSpring } from '@/lib/animations';

interface SidebarIndicatorProps {
  isVisible: boolean;
}

export const SidebarIndicator = memo(function SidebarIndicator({ isVisible }: SidebarIndicatorProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      layoutId="sidebar-indicator"
      className="hidden lg:block absolute inset-0 -left-4 -right-4"
      initial={false}
      transition={quickSpring}
    >
      {/* Main Indicator Bar */}
      <div 
        className="absolute right-0 w-[calc(100%+16px)] h-full bg-white rounded-l-[28px]"
        style={{ boxShadow: '0 4px 20px rgba(45, 91, 255, 0.15)' }}
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
      
      {/* Blue accent line */}
      <motion.div 
        className="absolute left-6 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gradient-to-b from-[#2D5BFF] to-[#5C7FFF]"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
      />
    </motion.div>
  );
});
