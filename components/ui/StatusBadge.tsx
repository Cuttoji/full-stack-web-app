'use client';

import { TaskStatus, TaskStatusColors, TaskStatusLabels, LeaveStatus, LeaveStatusLabels, CarStatus, CarStatusLabels } from '@/lib/types';
import { getStatusBgColor } from '@/lib/utils';

type BadgeType = 'task' | 'leave' | 'car';

interface StatusBadgeProps {
  status: TaskStatus | LeaveStatus | CarStatus | string;
  type?: BadgeType;
  size?: 'sm' | 'md';
}

const LeaveStatusColors: Record<LeaveStatus, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444',
  CANCELLED: '#6b7280',
};

const CarStatusColors: Record<CarStatus, string> = {
  AVAILABLE: '#22c55e',
  IN_USE: '#3b82f6',
  MAINTENANCE: '#f59e0b',
  OUT_OF_SERVICE: '#ef4444',
};

export function StatusBadge({ status, type = 'task', size = 'md' }: StatusBadgeProps) {
  const bgColor = getStatusBgColor(status);
  
  let label = status;
  let dotColor = '#6b7280';
  
  switch (type) {
    case 'task':
      label = TaskStatusLabels[status as TaskStatus] || status;
      dotColor = TaskStatusColors[status as TaskStatus] || '#6b7280';
      break;
    case 'leave':
      label = LeaveStatusLabels[status as LeaveStatus] || status;
      dotColor = LeaveStatusColors[status as LeaveStatus] || '#6b7280';
      break;
    case 'car':
      label = CarStatusLabels[status as CarStatus] || status;
      dotColor = CarStatusColors[status as CarStatus] || '#6b7280';
      break;
  }
  
  const sizeClasses = size === 'sm' ? 'text-xs px-3 py-1' : 'text-sm px-4 py-1.5';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${bgColor} ${sizeClasses} backdrop-blur-sm border border-white/30 shadow-sm`}
    >
      <span
        className="w-2 h-2 rounded-full mr-2 shadow-sm"
        style={{ backgroundColor: dotColor }}
      />
      {label}
    </span>
  );
}
