'use client';

import { useState, useEffect, useRef } from 'react';
import { Task, TaskStatus, TaskStatusColors } from '@/lib/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateRange } from '@/lib/utils';
import { Calendar, MapPin, User, Car, MoreVertical, XCircle, Trash2, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  showAssignees?: boolean;
  compact?: boolean;
  onCancel?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onRestore?: (taskId: string) => void;
  showActions?: boolean;
  isTrashView?: boolean;
}

export function TaskCard({ 
  task, 
  onClick, 
  showAssignees = true, 
  compact = false,
  onCancel,
  onDelete,
  onRestore,
  showActions = true,
  isTrashView = false,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCancel) {
      onCancel(task.id);
    }
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(task.id);
    }
    setShowMenu(false);
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRestore) {
      onRestore(task.id);
    }
    setShowMenu(false);
  };

  const cardContent = (
    <div
      className={`
        bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-white/20 dark:border-slate-700/30 shadow-glass
        hover:shadow-xl hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-300 cursor-pointer
        ${compact ? 'p-3' : 'p-5'}
        ${task.deletedAt ? 'opacity-60' : ''}
        relative
      `}
      onClick={onClick}
    >
      {/* Action Menu Button */}
      {showActions && !onClick && (
        <div className="absolute top-3 right-3 z-30" ref={menuRef}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 min-w-[140px] z-50">
              {isTrashView ? (
                <>
                  <button
                    onClick={handleRestore}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-green-600 dark:text-green-400"
                  >
                    <RotateCcw className="w-4 h-4" />
                    กู้คืน
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    ลบถาวร
                  </button>
                </>
              ) : (
                <>
                  {/* แสดงลบงาน เฉพาะเมื่อสถานะเป็นยกเลิก */}
                  {(task.status === 'CANCELLED') && (
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                      ลบงาน
                    </button>
                  )}
                  {/* แสดงยกเลิกงาน เฉพาะเมื่อสถานะไม่ใช่ยกเลิกหรือจบงาน */}
                  {task.status !== 'CANCELLED' && task.status !== 'DONE' && (
                    <button
                      onClick={handleCancel}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-amber-600 dark:text-amber-400"
                    >
                      <XCircle className="w-4 h-4" />
                      ยกเลิกงาน
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2 pr-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs text-gray-900 dark:text-gray-300 font-mono">{task.jobNumber}</span>
            {task.deletedAt && (
              <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                ในถังขยะ
              </span>
            )}
          </div>
          <h4 className={`font-medium text-gray-900 dark:text-white truncate ${compact ? 'text-sm' : ''}`}>
            {task.title}
          </h4>
        </div>
        <StatusBadge status={task.status} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Details */}
      {!compact && (
        <div className="space-y-1.5 text-sm text-gray-900 dark:text-gray-300">
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
        <div className={`flex items-center ${compact ? 'mt-2' : 'mt-3 pt-3 border-t border-gray-100 dark:border-slate-700'}`}>
          <div className="flex -space-x-2">
            {task.assignments.slice(0, 3).map((assignment) => (
              <div
                key={assignment.id}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xs font-semibold shadow-lg shadow-[#2D5BFF]/30"
                title={assignment.user?.name}
              >
                {assignment.user?.name?.charAt(0)}
              </div>
            ))}
            {task.assignments.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border-2 border-white dark:border-slate-800 flex items-center justify-center text-gray-900 dark:text-white text-xs font-semibold shadow-md">
                +{task.assignments.length - 3}
              </div>
            )}
          </div>
          {!compact && (
            <span className="ml-2 text-xs text-gray-900 dark:text-gray-300">
              {task.assignments.length} คน
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return cardContent;
  }

  return (
    <Link href={`/tasks/${task.id}`}>
      {cardContent}
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
