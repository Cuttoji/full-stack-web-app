/**
 * Simple in-memory cache implementation
 * For production, consider using Redis or similar distributed cache
 */

interface CacheItem<T> {
  value: T;
  expiry: number;
}

class MemoryCache {
  private cache: Map<string, CacheItem<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs: number = 60000) {
    // Run cleanup every minute by default
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, cleanupIntervalMs);
    }
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set a value in cache with TTL in seconds
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get or set - returns cached value or computes and caches new value
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval (for graceful shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
let cacheInstance: MemoryCache | null = null;

export function getCache(): MemoryCache {
  if (!cacheInstance) {
    cacheInstance = new MemoryCache();
  }
  return cacheInstance;
}

// Pre-defined cache keys for consistency
export const CacheKeys = {
  // User-related
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email}`,
  usersList: (departmentId?: string) => `users:list:${departmentId || 'all'}`,
  
  // Department-related
  departments: () => 'departments:all',
  department: (id: string) => `department:${id}`,
  subUnits: (departmentId?: string) => `subunits:${departmentId || 'all'}`,
  
  // Task-related
  task: (id: string) => `task:${id}`,
  tasksList: (filters: string) => `tasks:list:${filters}`,
  tasksCount: (userId?: string) => `tasks:count:${userId || 'all'}`,
  
  // Leave-related
  leave: (id: string) => `leave:${id}`,
  leaveQuota: (userId: string, year: number) => `leave:quota:${userId}:${year}`,
  
  // Dashboard
  dashboardStats: (userId: string) => `dashboard:stats:${userId}`,
  
  // Notifications
  notifications: (userId: string) => `notifications:${userId}`,
  notificationsCount: (userId: string) => `notifications:count:${userId}`,
};

// TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes
  LONG: 900,          // 15 minutes
  HOUR: 3600,         // 1 hour
  DAY: 86400,         // 24 hours
};

// Helper to invalidate related cache entries
export function invalidateUserCache(userId: string): void {
  const cache = getCache();
  cache.delete(CacheKeys.user(userId));
  cache.deletePattern(`users:list:*`);
  cache.delete(CacheKeys.dashboardStats(userId));
  cache.delete(CacheKeys.notifications(userId));
  cache.delete(CacheKeys.notificationsCount(userId));
}

export function invalidateTaskCache(taskId?: string): void {
  const cache = getCache();
  if (taskId) {
    cache.delete(CacheKeys.task(taskId));
  }
  cache.deletePattern(`tasks:*`);
  cache.deletePattern(`dashboard:*`);
}

export function invalidateLeaveCache(userId: string): void {
  const cache = getCache();
  cache.deletePattern(`leave:*:${userId}:*`);
  cache.deletePattern(`dashboard:*`);
}

export { MemoryCache };
