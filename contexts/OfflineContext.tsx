'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { OfflineAction, SyncResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface SyncResultWithIds extends SyncResult {
  syncedIds?: string[];  // IDs ของ action ที่ sync สำเร็จ
  failedIds?: string[];  // IDs ของ action ที่ sync ล้มเหลว
}

interface OfflineContextType {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  addOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp'>) => void;
  syncPendingActions: () => Promise<SyncResultWithIds>;
  clearPendingActions: () => void;
  removeAction: (actionId: string) => void;
  retryFailedActions: () => Promise<SyncResultWithIds>;
  deviceId: string;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const STORAGE_KEY = 'offline_actions';
const DEVICE_ID_KEY = 'device_id';

// Helper to get or create device ID (runs synchronously for lazy initialization)
function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// Helper to load pending actions from localStorage
function loadPendingActions(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed.filter(action => 
        action && typeof action.id === 'string' && typeof action.timestamp === 'number'
      );
    }
  } catch (e) {
    console.error('Failed to parse stored offline actions:', e);
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  // Use lazy initialization to avoid useEffect for initial state
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>(loadPendingActions);
  const [deviceId] = useState<string>(getOrCreateDeviceId);
  
  // Use ref to store sync function for use in event handler
  const syncRef = useRef<(() => Promise<SyncResultWithIds>) | null>(null);

  // Remove specific action from pending list
  const removeAction = useCallback((actionId: string) => {
    setPendingActions(prev => prev.filter(action => action.id !== actionId));
  }, []);

  // Remove only successfully synced actions (by IDs)
  const removeSyncedActions = useCallback((syncedIds: string[]) => {
    if (syncedIds.length === 0) return;
    setPendingActions(prev => prev.filter(action => !syncedIds.includes(action.id)));
  }, []);

  const syncPendingActions = useCallback(async (): Promise<SyncResultWithIds> => {
    if (!navigator.onLine || pendingActions.length === 0) {
      return { success: true, synced: 0, failed: 0, syncedIds: [], failedIds: [] };
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return { 
        success: false, 
        synced: 0, 
        failed: pendingActions.length, 
        errors: ['Not authenticated'],
        syncedIds: [],
        failedIds: pendingActions.map(a => a.id),
      };
    }

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          actions: pendingActions,
          deviceId,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const result = data.data as SyncResultWithIds;
        
        // ลบเฉพาะ action ที่ sync สำเร็จจริงๆ เท่านั้น
        if (result.syncedIds && result.syncedIds.length > 0) {
          removeSyncedActions(result.syncedIds);
        } else if (result.synced === pendingActions.length && result.failed === 0) {
          // Fallback: ถ้า API ไม่ส่ง syncedIds แต่ sync สำเร็จทั้งหมด
          setPendingActions([]);
        }
        
        return result;
      } else {
        return {
          success: false,
          synced: 0,
          failed: pendingActions.length,
          errors: [data.error || 'Sync failed'],
          syncedIds: [],
          failedIds: pendingActions.map(a => a.id),
        };
      }
    } catch (error) {
      return {
        success: false,
        synced: 0,
        failed: pendingActions.length,
        errors: [error instanceof Error ? error.message : 'Network error'],
        syncedIds: [],
        failedIds: pendingActions.map(a => a.id),
      };
    }
  }, [pendingActions, deviceId, removeSyncedActions]);

  // Retry only failed actions
  const retryFailedActions = useCallback(async (): Promise<SyncResultWithIds> => {
    // Simply call syncPendingActions since pendingActions now only contains failed ones
    return syncPendingActions();
  }, [syncPendingActions]);

  // Keep ref updated in effect
  useEffect(() => {
    syncRef.current = syncPendingActions;
  }, [syncPendingActions]);

  // Set up online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncRef.current?.();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save pending actions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions));
  }, [pendingActions]);

  const addOfflineAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: uuidv4(),
      timestamp: Date.now(),
    };

    setPendingActions((prev) => [...prev, newAction]);
  }, []);

  const clearPendingActions = useCallback(() => {
    setPendingActions([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingActions,
        addOfflineAction,
        syncPendingActions,
        clearPendingActions,
        removeAction,
        retryFailedActions,
        deviceId,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
