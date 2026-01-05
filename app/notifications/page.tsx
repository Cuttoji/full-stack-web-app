'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, Modal } from '@/components/ui';
import {
  Bell,
  CheckCircle,
  Clock,
  FileText,
  Calendar,
  AlertTriangle,
  Trash2,
  Check,
  RefreshCw,
  Filter,
  ChevronRight,
  Search,
  Settings,
  Archive,
  ChevronDown,
} from 'lucide-react';
import { getRelativeTime, formatDate } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
  data?: Record<string, unknown>;
}

// Notification types configuration
const NOTIFICATION_TYPES: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  TASK_ASSIGNED: { label: 'มอบหมายงาน', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: FileText },
  TASK_UPDATED: { label: 'อัปเดตงาน', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: FileText },
  TASK_COMPLETED: { label: 'งานเสร็จ', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  TASK_CANCELLED: { label: 'ยกเลิกงาน', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertTriangle },
  TASK_REMINDER: { label: 'เตือนความจำ', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Clock },
  TASK_OVERDUE: { label: 'เลยกำหนด', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertTriangle },
  LEAVE_REQUEST: { label: 'คำขอลา', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Calendar },
  LEAVE_APPROVED: { label: 'อนุมัติลา', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  LEAVE_REJECTED: { label: 'ปฏิเสธลา', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertTriangle },
  CONFLICT_DETECTED: { label: 'ขัดแย้ง', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle },
  CAR_CONFLICT: { label: 'รถซ้ำ', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle },
  SCHEDULE_CONFLICT: { label: 'ตารางซ้ำ', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle },
  SYSTEM_ANNOUNCEMENT: { label: 'ประกาศ', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Bell },
  WELCOME: { label: 'ยินดีต้อนรับ', color: 'text-green-600', bgColor: 'bg-green-100', icon: Bell },
  GENERAL: { label: 'ทั่วไป', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Bell },
  TASK: { label: 'งาน', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: FileText },
  LEAVE: { label: 'การลา', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Calendar },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchNotifications = useCallback(async (reset = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('limit', '20');
      params.append('offset', reset ? '0' : String(page * 20));
      
      if (filter === 'unread') params.append('unreadOnly', 'true');
      if (typeFilter) params.append('type', typeFilter);

      const response = await fetch(`/api/notifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        if (reset) {
          setNotifications(data.data?.notifications || []);
          setPage(1);
        } else {
          setNotifications(prev => [...prev, ...(data.data?.notifications || [])]);
          setPage(prev => prev + 1);
        }
        setTotal(data.data?.total || 0);
        setHasMore(data.data?.hasMore || false);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, typeFilter, page]);

  useEffect(() => {
    fetchNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, typeFilter]);

  // Filter notifications locally by search query and read status
  const filteredNotifications = useMemo(() => {
    let result = notifications;
    
    if (filter === 'read') {
      result = result.filter(n => n.isRead);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [notifications, filter, searchQuery]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    filteredNotifications.forEach(notif => {
      const date = new Date(notif.createdAt).toDateString();
      let label = formatDate(notif.createdAt);
      
      if (date === today) label = 'วันนี้';
      else if (date === yesterday) label = 'เมื่อวาน';
      
      if (!groups[label]) groups[label] = [];
      groups[label].push(notif);
    });
    
    return groups;
  }, [filteredNotifications]);

  const handleMarkAsRead = async (ids: string[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationIds: ids }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (ids.includes(n.id) ? { ...n, isRead: true } : n))
        );
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (ids: string[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationIds: ids }),
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
        setSelectedIds(new Set());
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete notifications:', error);
    }
  };

  const handleDeleteRead = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deleteRead: true }),
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => !n.isRead));
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete read notifications:', error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getNotificationConfig = (type: string) => {
    return NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.GENERAL;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 text-gray-800 mt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-7 h-7" />
              การแจ้งเตือน
            </h1>
            <p className="text-gray-500 mt-1">
              {unreadCount > 0 ? (
                <span className="text-blue-600 font-medium">{unreadCount} รายการที่ยังไม่ได้อ่าน</span>
              ) : (
                'ไม่มีการแจ้งเตือนใหม่'
              )}
              {total > 0 && <span className="text-gray-400"> • ทั้งหมด {total} รายการ</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchNotifications(true)} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">ตัวกรอง</span>
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <Check className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">อ่านทั้งหมด</span>
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(true)} className="text-red-600 hover:bg-red-50">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาการแจ้งเตือน..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Status Filter */}
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="unread">ยังไม่ได้อ่าน</option>
                    <option value="read">อ่านแล้ว</option>
                  </select>
                  
                  {/* Type Filter */}
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ประเภททั้งหมด</option>
                    <optgroup label="งาน">
                      <option value="TASK_ASSIGNED">ได้รับมอบหมายงาน</option>
                      <option value="TASK_COMPLETED">งานเสร็จสมบูรณ์</option>
                      <option value="TASK_CANCELLED">งานถูกยกเลิก</option>
                      <option value="TASK_REMINDER">เตือนความจำ</option>
                    </optgroup>
                    <optgroup label="การลา">
                      <option value="LEAVE_REQUEST">คำขอลาใหม่</option>
                      <option value="LEAVE_APPROVED">อนุมัติการลา</option>
                      <option value="LEAVE_REJECTED">ปฏิเสธการลา</option>
                    </optgroup>
                    <optgroup label="ความขัดแย้ง">
                      <option value="CONFLICT_DETECTED">พบความขัดแย้ง</option>
                    </optgroup>
                    <optgroup label="ระบบ">
                      <option value="SYSTEM_ANNOUNCEMENT">ประกาศระบบ</option>
                    </optgroup>
                  </select>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => { setFilter('all'); setTypeFilter(''); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'all' && !typeFilter
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => { setFilter('unread'); setTypeFilter(''); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              filter === 'unread'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ยังไม่ได้อ่าน
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === 'TASK' ? '' : 'TASK')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              typeFilter === 'TASK'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📋 งาน
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === 'LEAVE' ? '' : 'LEAVE')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              typeFilter === 'LEAVE'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📅 การลา
          </button>
        </div>

        {/* Bulk Actions */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="sticky top-0 z-10"
            >
              <Card padding="sm" className="bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">
                    เลือก {selectedIds.size} รายการ
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleMarkAsRead([...selectedIds])}>
                      <Check className="w-4 h-4 mr-1" />
                      อ่านแล้ว
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete([...selectedIds])}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      ลบ
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications List */}
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {date}
                </h3>
                <div className="space-y-2">
                  {items.map((notification, index) => {
                    const config = getNotificationConfig(notification.type);
                    const Icon = config.icon;
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Card
                          className={`transition-all cursor-pointer hover:shadow-md ${
                            !notification.isRead
                              ? 'bg-blue-50/70 border-blue-200 shadow-sm'
                              : 'hover:bg-gray-50'
                          } ${selectedIds.has(notification.id) ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => toggleSelect(notification.id)}
                        >
                          <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            <div className="pt-1">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(notification.id)}
                                onChange={() => toggleSelect(notification.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                            </div>
                            
                            {/* Icon */}
                            <div className={`flex-shrink-0 p-2 rounded-full ${config.bgColor}`}>
                              <Icon className={`w-5 h-5 ${config.color}`} />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                    {notification.title}
                                  </h3>
                                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {getRelativeTime(notification.createdAt)}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                                      {config.label}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {notification.link && (
                                    <a
                                      href={notification.link}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!notification.isRead) {
                                          handleMarkAsRead([notification.id]);
                                        }
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="ดูรายละเอียด"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </a>
                                  )}
                                  {!notification.isRead && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAsRead([notification.id]);
                                      }}
                                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                      title="ทำเครื่องหมายว่าอ่านแล้ว"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete([notification.id]);
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="ลบ"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchNotifications(false)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  )}
                  โหลดเพิ่มเติม
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <div className="text-center py-16 text-gray-500">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-700">ไม่มีการแจ้งเตือน</p>
              <p className="text-sm mt-1">
                {filter === 'unread'
                  ? 'คุณอ่านการแจ้งเตือนทั้งหมดแล้ว! 🎉'
                  : searchQuery
                  ? 'ไม่พบการแจ้งเตือนที่ตรงกับการค้นหา'
                  : 'ยังไม่มีการแจ้งเตือนในขณะนี้'}
              </p>
            </div>
          </Card>
        )}

        {/* Settings Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="จัดการการแจ้งเตือน"
        >
          <div className="space-y-4">
            <p className="text-gray-600">เลือกการดำเนินการที่ต้องการ</p>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleDeleteRead}
              >
                <Archive className="w-4 h-4 mr-3" />
                ลบการแจ้งเตือนที่อ่านแล้วทั้งหมด
              </Button>
              
              <Button
                variant="danger"
                className="w-full justify-start"
                onClick={() => {
                  if (confirm('คุณแน่ใจหรือไม่ที่จะลบการแจ้งเตือนทั้งหมด?')) {
                    handleDelete(notifications.map(n => n.id));
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-3" />
                ลบการแจ้งเตือนทั้งหมด
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <Button variant="ghost" className="w-full" onClick={() => setIsDeleteModalOpen(false)}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
