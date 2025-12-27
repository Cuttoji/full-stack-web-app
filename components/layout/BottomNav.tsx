'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Calendar, User } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'หน้าหลัก' },
  { href: '/tasks', icon: ClipboardList, label: 'งาน' },
  { href: '/calendar', icon: Calendar, label: 'ปฏิทิน' },
  { href: '/settings', icon: User, label: 'โปรไฟล์' },
];

export function BottomNav() {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);

  // Find active index based on pathname
  useEffect(() => {
    const index = navItems.findIndex(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [pathname, activeIndex]);

  // Calculate the position for the floating circle
  const circlePosition = useMemo(() => {
    const itemWidth = 100 / navItems.length;
    return itemWidth * activeIndex + itemWidth / 2;
  }, [activeIndex]);

  return (
    <nav
      id="bottom-nav"
      className="lg:hidden fixed bottom-4 left-4 right-4 z-40"
    >
      <div className="relative">
        {/* Dark Background Container */}
        <div 
          className="relative bg-[#222327] rounded-[20px] overflow-visible pt-4"
          style={{ 
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}
        >
          {/* Floating Circle Indicator with Framer Motion */}
          <motion.div
            className="absolute z-20"
            initial={false}
            animate={{
              left: `calc(${circlePosition}% - 28px)`,
            }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 30,
            }}
            style={{ top: '-20px' }}
          >
            {/* Left Curved Hole */}
            <div 
              className="absolute top-[20px] -left-[20px] w-[20px] h-[40px]"
              style={{
                background: 'transparent',
                borderTopRightRadius: '20px',
                boxShadow: '8px -8px 0 8px #222327',
              }}
            />
            
            {/* Right Curved Hole */}
            <div 
              className="absolute top-[20px] -right-[20px] w-[20px] h-[40px]"
              style={{
                background: 'transparent',
                borderTopLeftRadius: '20px',
                boxShadow: '-8px -8px 0 8px #222327',
              }}
            />

            {/* Outer Glow */}
            <motion.div 
              className="absolute inset-[-4px] rounded-full bg-[#2D5BFF]/20 blur-xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Main Circle - Blue/White Theme */}
            <motion.div 
              className="relative w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #2D5BFF 0%, #5C7FFF 100%)',
                boxShadow: '0 8px 24px rgba(45, 91, 255, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
              }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Active Icon */}
              {(() => {
                const ActiveIcon = navItems[activeIndex]?.icon;
                return ActiveIcon ? (
                  <motion.div
                    key={activeIndex}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <ActiveIcon className="w-6 h-6 text-white stroke-[2.5]" />
                  </motion.div>
                ) : null;
              })()}
              
              {/* Shine Effect */}
              <div className="absolute top-2 left-3 w-5 h-2.5 bg-white/30 rounded-full blur-[2px]" />
            </motion.div>
          </motion.div>

          {/* Navigation Items */}
          <div className="relative flex items-center justify-around pb-5 px-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === activeIndex;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-nav-item
                  className="relative flex flex-col items-center justify-center flex-1 group py-1"
                  onClick={() => setActiveIndex(index)}
                >
                  {/* Icon - Hidden when active */}
                  <motion.div
                    animate={{
                      opacity: isActive ? 0 : 1,
                      scale: isActive ? 0.5 : 1,
                      y: isActive ? -24 : 0,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                    }}
                  >
                    <Icon
                      className={cn(
                        'w-6 h-6 transition-colors duration-300',
                        isActive
                          ? 'text-[#2D5BFF]'
                          : 'text-gray-500 group-hover:text-gray-300 group-active:scale-90'
                      )}
                    />
                  </motion.div>

                  {/* Label */}
                  <motion.span
                    className={cn(
                      'text-[10px] mt-1 font-medium',
                      isActive
                        ? 'text-[#2D5BFF]'
                        : 'text-gray-500 group-hover:text-gray-300'
                    )}
                    animate={{
                      opacity: isActive ? 0 : 1,
                      y: isActive ? -16 : 0,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                    }}
                  >
                    {item.label}
                  </motion.span>

                  {/* Spacer for active */}
                  {isActive && <div className="h-7" />}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
