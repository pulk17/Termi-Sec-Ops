// Performance monitoring and Web Vitals tracking

import { onCLS, onFID, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';

export interface PerformanceMetrics {
  cls: number | null; // Cumulative Layout Shift
  fid: number | null; // First Input Delay
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  ttfb: number | null; // Time to First Byte
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface PerformanceConfig {
  enableConsoleLogging?: boolean;
  enableAnalytics?: boolean;
  sampleRate?: number; // 0-1, percentage of sessions to track
  onMetric?: (metric: Metric) => void;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private config: PerformanceConfig;
  private observers: PerformanceObserver[] = [];

  private constructor(config: PerformanceConfig = {}) {
    this.config = {
      enableConsoleLogging: false,
      enableAnalytics: true,
      sampleRate: 0.1, // Only track 10% of sessions to reduce storage usage
      ...config
    };

    this.metrics = {
      cls: null,
      fid: null,
      fcp: null,
      lcp: null,
      ttfb: null,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    };
  }

  static getInstance(config?: PerformanceConfig): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  init(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Check if we should track this session based on sample rate
    if (Math.random() > this.config.sampleRate!) {
      return;
    }

    this.initWebVitals();
    this.initCustomMetrics();
    this.initResourceTiming();
  }

  private initWebVitals(): void {
    const onMetric = (metric: Metric) => {
      // Update internal metrics
      const metricKey = metric.name.toLowerCase() as keyof PerformanceMetrics;
      if (metricKey in this.metrics) {
        (this.metrics as any)[metricKey] = metric.value;
      }

      if (this.config.enableConsoleLogging) {
        console.log(`${metric.name}: ${metric.value}`);
      }

      // Call custom handler
      this.config.onMetric?.(metric);

      // Send to analytics if enabled
      if (this.config.enableAnalytics) {
        this.sendMetricToAnalytics(metric);
      }
    };

    // Initialize Web Vitals
    onCLS(onMetric);
    onFID(onMetric);
    onFCP(onMetric);
    onLCP(onMetric);
    onTTFB(onMetric);
  }

  private initCustomMetrics(): void {
    // Track page load time
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        this.trackCustomMetric('page_load_time', loadTime);
      });
    }

    // Track route changes (for SPA)
    if (typeof window !== 'undefined') {
      let lastUrl = window.location.href;
      
      const trackRouteChange = () => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          this.trackCustomMetric('route_change', performance.now());
          lastUrl = currentUrl;
        }
      };

      // Listen for history changes
      window.addEventListener('popstate', trackRouteChange);
      
      // Override pushState and replaceState
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        trackRouteChange();
      };

      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        trackRouteChange();
      };
    }
  }

  private initResourceTiming(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      // Observe resource loading performance
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.trackResourceTiming(entry as PerformanceResourceTiming);
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            this.trackLongTask(entry);
          }
        }
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  private trackResourceTiming(entry: PerformanceResourceTiming): void {
    const resourceMetric = {
      name: entry.name,
      duration: entry.duration,
      size: entry.transferSize,
      type: this.getResourceType(entry.name),
      timestamp: Date.now()
    };

    if (this.config.enableConsoleLogging) {
      console.log('Resource timing:', resourceMetric);
    }

    // Track slow resources
    if (entry.duration > 1000) { // > 1 second
      this.trackCustomMetric('slow_resource', entry.duration, {
        resource: entry.name,
        type: resourceMetric.type
      });
    }
  }

  private trackLongTask(entry: PerformanceEntry): void {
    const longTaskMetric = {
      duration: entry.duration,
      startTime: entry.startTime,
      timestamp: Date.now()
    };

    if (this.config.enableConsoleLogging) {
      console.log('Long task detected:', longTaskMetric);
    }

    this.trackCustomMetric('long_task', entry.duration);
  }

  private getResourceType(url: string): string {
    if (url.includes('/_next/static/css/')) return 'css';
    if (url.includes('/_next/static/js/')) return 'js';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  trackCustomMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric = {
      name,
      value,
      metadata,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : ''
    };

    if (this.config.enableConsoleLogging) {
      console.log(`Custom metric - ${name}:`, metric);
    }

    if (this.config.enableAnalytics) {
      this.sendCustomMetricToAnalytics(metric);
    }
  }

  private sendMetricToAnalytics(metric: Metric): void {
    // In a real implementation, you would send this to your analytics service
    // For now, we'll store it locally for debugging with quota management
    if (typeof window !== 'undefined') {
      const key = `perf_metric_${metric.name}`;
      const data = JSON.stringify({
        ...metric,
        timestamp: Date.now(),
        url: window.location.href
      });
      
      try {
        // Check if we can store this data
        this.manageStorageQuota();
        localStorage.setItem(key, data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          this.clearOldMetrics();
          // Try once more after clearing
          try {
            localStorage.setItem(key, data);
          } catch {
            console.warn('Unable to store performance metrics - localStorage full');
          }
        }
      }
    }
  }

  private sendCustomMetricToAnalytics(metric: any): void {
    // Similar to above, store locally for now with quota management
    if (typeof window !== 'undefined') {
      const key = `custom_metric_${metric.name}_${Date.now()}`;
      const data = JSON.stringify(metric);
      
      try {
        // Check if we can store this data
        this.manageStorageQuota();
        localStorage.setItem(key, data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          this.clearOldMetrics();
          // Try once more after clearing
          try {
            localStorage.setItem(key, data);
          } catch {
            console.warn('Unable to store custom metrics - localStorage full');
          }
        }
      }
    }
  }

  private manageStorageQuota(): void {
    if (typeof window === 'undefined') return;
    
    // Count current metric entries
    let metricCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('perf_metric_') || key?.startsWith('custom_metric_')) {
        metricCount++;
      }
    }
    
    // If we have too many metrics, clear some old ones
    if (metricCount > 100) {
      this.clearOldMetrics();
    }
  }

  private clearOldMetrics(): void {
    if (typeof window === 'undefined') return;
    
    const metricsToRemove: string[] = [];
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('perf_metric_') || key?.startsWith('custom_metric_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (now - parsed.timestamp > maxAge) {
              metricsToRemove.push(key);
            }
          }
        } catch {
          // If we can't parse it, remove it
          metricsToRemove.push(key);
        }
      }
    }
    
    // Remove old metrics
    metricsToRemove.forEach(key => localStorage.removeItem(key));
    
    // If still too many, remove oldest ones
    if (metricsToRemove.length === 0) {
      const allMetrics: Array<{key: string, timestamp: number}> = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('perf_metric_') || key?.startsWith('custom_metric_')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              allMetrics.push({ key, timestamp: parsed.timestamp || 0 });
            }
          } catch {
            allMetrics.push({ key, timestamp: 0 });
          }
        }
      }
      
      // Sort by timestamp and remove oldest 50%
      allMetrics.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = allMetrics.slice(0, Math.floor(allMetrics.length / 2));
      toRemove.forEach(item => localStorage.removeItem(item.key));
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getStoredMetrics(): any[] {
    if (typeof window === 'undefined') {
      return [];
    }

    const metrics = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('perf_metric_') || key?.startsWith('custom_metric_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            metrics.push(JSON.parse(value));
          }
        } catch (error) {
          console.warn('Failed to parse stored metric:', key, error);
        }
      }
    }

    return metrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  clearStoredMetrics(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('perf_metric_') || key?.startsWith('custom_metric_')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  destroy(): void {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Utility functions for performance optimization
export const performanceUtils = {
  // Debounce function calls
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function calls
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Measure function execution time
  measureTime<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`${name} took ${end - start} milliseconds`);
    
    // Track as custom metric
    PerformanceMonitor.getInstance().trackCustomMetric(
      'function_execution_time',
      end - start,
      { functionName: name }
    );
    
    return result;
  },

  // Async version of measureTime
  async measureTimeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    console.log(`${name} took ${end - start} milliseconds`);
    
    PerformanceMonitor.getInstance().trackCustomMetric(
      'async_function_execution_time',
      end - start,
      { functionName: name }
    );
    
    return result;
  }
};