// React hook for performance optimization features

import { useEffect, useRef, useState, useCallback } from 'react';
import { ServiceWorkerManager, CacheManager } from '@/lib/service-worker';
import { PerformanceMonitor, performanceUtils } from '@/lib/performance-monitor';
import { ProgressiveLoader, VirtualScrollManager, IntersectionLoadTrigger } from '@/lib/progressive-loading';
import { APICache, VulnerabilityCache } from '@/lib/intelligent-cache';

export interface PerformanceConfig {
  enableServiceWorker?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableProgressiveLoading?: boolean;
  enableIntelligentCaching?: boolean;
  serviceWorkerConfig?: {
    onUpdate?: (registration: ServiceWorkerRegistration) => void;
    onSuccess?: (registration: ServiceWorkerRegistration) => void;
  };
}

export interface PerformanceState {
  isServiceWorkerReady: boolean;
  isOnline: boolean;
  cacheSize: number;
  performanceMetrics: any;
  updateAvailable: boolean;
}

export function usePerformanceOptimization(config: PerformanceConfig = {}) {
  const [state, setState] = useState<PerformanceState>({
    isServiceWorkerReady: false,
    isOnline: navigator?.onLine ?? true,
    cacheSize: 0,
    performanceMetrics: null,
    updateAvailable: false
  });

  const swManager = useRef<ServiceWorkerManager>();
  const perfMonitor = useRef<PerformanceMonitor>();
  const apiCache = useRef<APICache>();
  const vulnCache = useRef<VulnerabilityCache>();

  // Initialize performance optimizations (only once)
  useEffect(() => {
    const init = async () => {
      // Initialize Service Worker
      if (config.enableServiceWorker !== false && !swManager.current) {
        swManager.current = ServiceWorkerManager.getInstance();
        
        await swManager.current.register({
          onUpdate: (registration) => {
            setState(prev => ({ ...prev, updateAvailable: true }));
            config.serviceWorkerConfig?.onUpdate?.(registration);
          },
          onSuccess: (registration) => {
            setState(prev => ({ ...prev, isServiceWorkerReady: true }));
            config.serviceWorkerConfig?.onSuccess?.(registration);
          }
        });
      }

      // Initialize Performance Monitoring
      if (config.enablePerformanceMonitoring !== false && !perfMonitor.current) {
        perfMonitor.current = PerformanceMonitor.getInstance({
          enableConsoleLogging: process.env.NODE_ENV === 'development',
          enableAnalytics: true,
          sampleRate: 0.1, // 10% sampling in production
          onMetric: (metric) => {
            setState(prev => ({
              ...prev,
              performanceMetrics: { ...prev.performanceMetrics, [metric.name]: metric.value }
            }));
          }
        });
        
        perfMonitor.current.init();
      }

      // Initialize Intelligent Caching
      if (config.enableIntelligentCaching !== false && !apiCache.current) {
        apiCache.current = new APICache();
        vulnCache.current = new VulnerabilityCache();
      }

      // Update cache size
      const size = await CacheManager.getCacheSize();
      setState(prev => ({ ...prev, cacheSize: size }));
    };

    init();

    // Cleanup
    return () => {
      perfMonitor.current?.destroy();
      apiCache.current?.destroy();
      vulnCache.current?.destroy();
    };
  }, []); // Remove config dependency to prevent loops

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker methods
  const updateServiceWorker = useCallback(async () => {
    if (swManager.current) {
      await swManager.current.skipWaiting();
      window.location.reload();
    }
  }, []);

  const unregisterServiceWorker = useCallback(async () => {
    if (swManager.current) {
      const result = await swManager.current.unregister();
      if (result) {
        setState(prev => ({ ...prev, isServiceWorkerReady: false }));
      }
      return result;
    }
    return false;
  }, []);

  // Cache management methods
  const clearAllCaches = useCallback(async () => {
    await CacheManager.clearAllCaches();
    apiCache.current?.clear();
    vulnCache.current?.clear();
    
    const size = await CacheManager.getCacheSize();
    setState(prev => ({ ...prev, cacheSize: size }));
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      api: apiCache.current?.getStats(),
      vulnerability: vulnCache.current?.getStats()
    };
  }, []);

  // Performance tracking methods
  const trackCustomMetric = useCallback((name: string, value: number, metadata?: any) => {
    perfMonitor.current?.trackCustomMetric(name, value, metadata);
  }, []);

  const measurePerformance = useCallback(<T>(name: string, fn: () => T): T => {
    return performanceUtils.measureTime(name, fn);
  }, []);

  const measurePerformanceAsync = useCallback(async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    return performanceUtils.measureTimeAsync(name, fn);
  }, []);

  // Progressive loading utilities
  const createProgressiveLoader = useCallback(<T>(
    loadFunction: (page: number, pageSize: number) => Promise<{ items: T[]; totalCount: number }>,
    config?: any
  ) => {
    return new ProgressiveLoader(loadFunction, config);
  }, []);

  const createVirtualScrollManager = useCallback((config: any) => {
    return new VirtualScrollManager(config);
  }, []);

  // Caching utilities
  const cacheAPIResponse = useCallback(async <T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    if (!apiCache.current) {
      return fetchFn();
    }
    return apiCache.current.getOrFetch(key, fetchFn, ttl);
  }, []);

  const cacheVulnerabilities = useCallback(async (
    projectId: string,
    scanType: string,
    vulnerabilities: any[],
    metadata?: any
  ) => {
    if (vulnCache.current) {
      await vulnCache.current.cacheVulnerabilities(projectId, scanType, vulnerabilities, metadata);
    }
  }, []);

  const getCachedVulnerabilities = useCallback(async (
    projectId: string,
    scanType: string
  ) => {
    if (!vulnCache.current) return null;
    return vulnCache.current.getVulnerabilities(projectId, scanType);
  }, []);

  const invalidateCache = useCallback((pattern: string | RegExp) => {
    let invalidated = 0;
    if (apiCache.current) {
      invalidated += apiCache.current.invalidatePattern(pattern);
    }
    if (vulnCache.current) {
      invalidated += vulnCache.current.invalidatePattern(pattern);
    }
    return invalidated;
  }, []);

  // Debounced and throttled utilities
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ) => {
    return performanceUtils.debounce(func, wait);
  }, []);

  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ) => {
    return performanceUtils.throttle(func, limit);
  }, []);

  return {
    // State
    ...state,
    
    // Service Worker
    updateServiceWorker,
    unregisterServiceWorker,
    
    // Cache Management
    clearAllCaches,
    getCacheStats,
    
    // Performance Tracking
    trackCustomMetric,
    measurePerformance,
    measurePerformanceAsync,
    
    // Progressive Loading
    createProgressiveLoader,
    createVirtualScrollManager,
    
    // Intelligent Caching
    cacheAPIResponse,
    cacheVulnerabilities,
    getCachedVulnerabilities,
    invalidateCache,
    
    // Utilities
    debounce,
    throttle
  };
}

// Hook for progressive loading with React integration
export function useProgressiveLoading<T>(
  loadFunction: (page: number, pageSize: number) => Promise<{ items: T[]; totalCount: number }>,
  config?: any
) {
  const [loader] = useState(() => new ProgressiveLoader(loadFunction, config));
  const [state, setState] = useState(loader.getState());

  useEffect(() => {
    const unsubscribe = loader.subscribe(() => {
      setState(loader.getState());
    });

    // Load initial data
    loader.loadInitial();

    return unsubscribe;
  }, [loader]);

  const loadMore = useCallback(() => {
    loader.loadMore();
  }, [loader]);

  const reset = useCallback(() => {
    loader.reset();
  }, [loader]);

  return {
    ...state,
    loadMore,
    reset
  };
}

// Hook for virtual scrolling
export function useVirtualScroll(config: any) {
  const [manager] = useState(() => new VirtualScrollManager(config));
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      manager.setContainer(containerRef.current);
    }
  }, [manager]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    manager.updateScrollTop(newScrollTop);
  }, [manager]);

  const getVisibleRange = useCallback((totalItems: number) => {
    return manager.getVisibleRange(totalItems);
  }, [manager]);

  const getItemStyle = useCallback((index: number) => {
    return manager.getItemStyle(index);
  }, [manager]);

  const getTotalHeight = useCallback((totalItems: number) => {
    return manager.getTotalHeight(totalItems);
  }, [manager]);

  const scrollToItem = useCallback((index: number) => {
    manager.scrollToItem(index);
  }, [manager]);

  return {
    containerRef,
    scrollTop,
    handleScroll,
    getVisibleRange,
    getItemStyle,
    getTotalHeight,
    scrollToItem
  };
}

// Hook for intersection-based loading
export function useIntersectionLoading(
  callback: () => void,
  threshold = 0.1
) {
  const [trigger] = useState(() => new IntersectionLoadTrigger(callback, threshold));
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      trigger.observe(elementRef.current);
    }

    return () => {
      trigger.disconnect();
    };
  }, [trigger]);

  return elementRef;
}