/**
 * Application Performance Monitoring (APM) Utilities
 * 
 * This module provides basic performance monitoring capabilities.
 * For production, integrate with services like:
 * - Sentry (sentry.io)
 * - DataDog (datadoghq.com)
 * - New Relic (newrelic.com)
 * - Elastic APM
 */

import { logger, createLogger } from './logger';

const apmLogger = createLogger('APM');

// ==================== PERFORMANCE METRICS ====================

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;

  /**
   * Measure execution time of an async function
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, metadata);
      
      // Log slow operations (> 1 second)
      if (duration > 1000) {
        apmLogger.warn(`Slow operation detected: ${name}`, {
          data: { duration: `${duration.toFixed(2)}ms`, ...metadata },
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`${name}:error`, duration, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Measure execution time of a sync function
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`${name}:error`, duration, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Create a timer for manual measurement
   */
  startTimer(name: string): () => number {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration);
      return duration;
    };
  }

  private recordMetric(
    name: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    this.metrics.push({
      name,
      duration,
      timestamp: new Date(),
      metadata,
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics for a metric
   */
  getStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const relevantMetrics = this.metrics
      .filter((m) => m.name === name)
      .map((m) => m.duration);

    if (relevantMetrics.length === 0) {
      return null;
    }

    const sorted = [...relevantMetrics].sort((a, b) => a - b);
    const sum = relevantMetrics.reduce((a, b) => a + b, 0);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      count: relevantMetrics.length,
      avg: sum / relevantMetrics.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index] || sorted[sorted.length - 1],
    };
  }

  /**
   * Get all metrics summary
   */
  getSummary(): Record<string, ReturnType<typeof this.getStats>> {
    const uniqueNames = [...new Set(this.metrics.map((m) => m.name))];
    const summary: Record<string, ReturnType<typeof this.getStats>> = {};

    for (const name of uniqueNames) {
      summary[name] = this.getStats(name);
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

// ==================== ERROR TRACKING ====================

interface ErrorReport {
  error: Error;
  context?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private maxErrors: number = 100;

  /**
   * Report an error
   */
  report(
    error: Error,
    options?: {
      context?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const report: ErrorReport = {
      error,
      context: options?.context,
      userId: options?.userId,
      metadata: options?.metadata,
      timestamp: new Date(),
    };

    this.errors.push(report);

    // Log the error
    apmLogger.error(`Error reported: ${error.message}`, {
      error,
      data: options?.metadata,
      userId: options?.userId,
    });

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // In production, send to external service
    // this.sendToExternalService(report);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get error count by type
   */
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const report of this.errors) {
      const key = report.error.name || 'Unknown';
      stats[key] = (stats[key] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
  }

  // Placeholder for external service integration
  // private async sendToExternalService(report: ErrorReport): Promise<void> {
  //   // Integrate with Sentry, DataDog, etc.
  // }
}

// ==================== REQUEST TRACKING ====================

interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: string;
  timestamp: Date;
}

class RequestTracker {
  private requests: RequestMetric[] = [];
  private maxRequests: number = 1000;

  /**
   * Record a request
   */
  record(metric: Omit<RequestMetric, 'timestamp'>): void {
    this.requests.push({
      ...metric,
      timestamp: new Date(),
    });

    // Keep only recent requests
    if (this.requests.length > this.maxRequests) {
      this.requests = this.requests.slice(-this.maxRequests);
    }

    // Log slow requests (> 3 seconds)
    if (metric.duration > 3000) {
      apmLogger.warn(`Slow request: ${metric.method} ${metric.path}`, {
        data: {
          duration: `${metric.duration}ms`,
          statusCode: metric.statusCode,
        },
        userId: metric.userId,
      });
    }
  }

  /**
   * Get request statistics
   */
  getStats(): {
    totalRequests: number;
    avgDuration: number;
    errorRate: number;
    requestsByPath: Record<string, number>;
  } {
    const total = this.requests.length;
    const errors = this.requests.filter((r) => r.statusCode >= 400).length;
    const totalDuration = this.requests.reduce((sum, r) => sum + r.duration, 0);

    const requestsByPath: Record<string, number> = {};
    for (const req of this.requests) {
      const key = `${req.method} ${req.path}`;
      requestsByPath[key] = (requestsByPath[key] || 0) + 1;
    }

    return {
      totalRequests: total,
      avgDuration: total > 0 ? totalDuration / total : 0,
      errorRate: total > 0 ? errors / total : 0,
      requestsByPath,
    };
  }

  /**
   * Clear all requests
   */
  clear(): void {
    this.requests = [];
  }
}

// ==================== EXPORTS ====================

// Singleton instances
export const performanceMonitor = new PerformanceMonitor();
export const errorTracker = new ErrorTracker();
export const requestTracker = new RequestTracker();

// Convenience function for measuring async operations
export async function withPerformance<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return performanceMonitor.measure(name, fn, metadata);
}

// Middleware helper for API routes
export function createApiMetrics(method: string, path: string) {
  const startTime = performance.now();
  
  return {
    finish: (statusCode: number, userId?: string) => {
      const duration = performance.now() - startTime;
      requestTracker.record({
        method,
        path,
        statusCode,
        duration,
        userId,
      });
    },
  };
}

// Health check data for monitoring endpoints
export function getMonitoringData() {
  return {
    performance: performanceMonitor.getSummary(),
    errors: errorTracker.getErrorStats(),
    requests: requestTracker.getStats(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };
}
