'use client';

import { Task, TaskStatus, TaskStatusColors } from '@/lib/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatDateRange } from '@/lib/utils';
import { Calendar, MapPin, User, Car, Clock } from 'lucide-react';
import Link from 'next/link';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  showAssignees?: boolean;
  compact?: boolean;
}

export function TaskCard({ task, onClick, showAssignees = true, compact = false }: TaskCardProps) {
  const CardContent = () => (
    <div
      className={`
        bg-white/60 backdrop-blur-md rounded-2xl border border-white/20 shadow-glass
        hover:shadow-xl hover:bg-white/70 transition-all duration-300 cursor-pointer
        ${compact ? 'p-3' : 'p-5'}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs text-gray-900 font-mono">{task.jobNumber}</span>
          </div>
          <h4 className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : ''}`}>
            {task.title}
          </h4>
        </div>
        <StatusBadge status={task.status} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Details */}
      {!compact && (
        <div className="space-y-1.5 text-sm text-gray-900">
          {task.customerName && (
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{task.customerName}</span>
            </div>
          )}
          {task.location && (
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{task.location}</span>
            </div>
          )}
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>
              {formatDateRange(task.startDate, task.endDate)}
              {task.startTime && ` ${task.startTime}`}
              {task.endTime && ` - ${task.endTime}`}
            </span>
          </div>
          {task.car && (
            <div className="flex items-center">
              <Car className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{task.car.name} ({task.car.plateNumber})</span>
            </div>
          )}
        </div>
      )}

      {/* Assignees */}
      {showAssignees && task.assignments && task.assignments.length > 0 && (
        <div className={`flex items-center ${compact ? 'mt-2' : 'mt-3 pt-3 border-t border-gray-100'}`}>
          <div className="flex -space-x-2">
            {task.assignments.slice(0, 3).map((assignment) => (
              <div
                key={assignment.id}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] border-2 border-white flex items-center justify-center text-white text-xs font-semibold shadow-lg shadow-[#2D5BFF]/30"
                title={assignment.user?.name}
              >
                {assignment.user?.name?.charAt(0)}
              </div>
            ))}
            {task.assignments.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border-2 border-white flex items-center justify-center text-gray-900 text-xs font-semibold shadow-md">
                +{task.assignments.length - 3}
              </div>
            )}
          </div>
          {!compact && (
            <span className="ml-2 text-xs text-gray-900">
              {task.assignments.length} คน
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return <CardContent />;
  }

  return (
    <Link href={`/tasks/${task.id}`}>
      <CardContent />
    </Link>
  );
}

// Color indicator bar for calendar events
export function TaskColorBar({ status }: { status: TaskStatus }) {
  return (
    <div
      className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
      style={{ backgroundColor: TaskStatusColors[status] }}
    />
  );
}
