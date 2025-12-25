'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { OfflineAction, SyncResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface OfflineContextType {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  addOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp'>) => void;
  syncPendingActions: () => Promise<SyncResult>;
  clearPendingActions: () => void;
  deviceId: string;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const STORAGE_KEY = 'offline_actions';
const DEVICE_ID_KEY = 'device_id';

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  
  // Use ref to store sync function for use in event handler
  const syncRef = useRef<(() => Promise<SyncResult>) | null>(null);

  const syncPendingActions = useCallback(async (): Promise<SyncResult> => {
    if (!navigator.onLine || pendingActions.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, synced: 0, failed: pendingActions.length, errors: ['Not authenticated'] };
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

      if (data.success) {
        // Clear synced actions
        setPendingActions([]);
        return data.data as SyncResult;
      } else {
        return {
          success: false,
          synced: 0,
          failed: pendingActions.length,
          errors: [data.error],
        };
      }
    } catch {
      return {
        success: false,
        synced: 0,
        failed: pendingActions.length,
        errors: ['Network error'],
      };
    }
  }, [pendingActions, deviceId]);

  // Keep ref updated in effect
  useEffect(() => {
    syncRef.current = syncPendingActions;
  }, [syncPendingActions]);

  useEffect(() => {
    // Initialize device ID
    let storedDeviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!storedDeviceId) {
      storedDeviceId = uuidv4();
      localStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    // Load pending actions from localStorage
    const storedActions = localStorage.getItem(STORAGE_KEY);
    if (storedActions) {
      setPendingActions(JSON.parse(storedActions));
    }

    // Set up online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncRef.current?.();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    setIsOnline(navigator.onLine);
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
