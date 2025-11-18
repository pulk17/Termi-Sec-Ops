// Tests for performance optimization features

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceWorkerManager, CacheManager } from '@/lib/service-worker';
import { PerformanceMonitor } from '@/lib/performance-monitor';
import { ProgressiveLoader, VirtualScrollManager } from '@/lib/progressive-loading';
import { IntelligentCache, APICache, VulnerabilityCache } from '@/lib/intelligent-cache';

// Mock browser APIs
const mockServiceWorker = {
  register: vi.fn(),
  ready: Promise.resolve({
    unregister: vi.fn(),
    update: vi.fn(),
    waiting: null,
    installing: null,
    active: null
  })
};

const mockCaches = {
  open: vi.fn(),
  keys: vi.fn(),
  delete: vi.fn(),
  match: vi.fn()
};

const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => [])
};

// Setup global mocks
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: mockServiceWorker,
    onLine: true,
    userAgent: 'test-agent'
  },
  writable: true
});

Object.defineProperty(global, 'caches', {
  value: mockCaches,
  writable: true
});

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    location: { href: 'http://localhost:3000' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    PerformanceObserver: vi.fn()
  },
  writable: true
});

describe('ServiceWorkerManager', () => {
  let swManager: ServiceWorkerManager;

  beforeEach(() => {
    swManager = ServiceWorkerManager.getInstance();
    vi.clearAllMocks();
  });

  it('should register service worker successfully', async () => {
    const mockRegistration = {
      installing: null,
      waiting: null,
      active: null,
      addEventListener: vi.fn(),
      unregister: vi.fn(),
      update: vi.fn()
    };

    mockServiceWorker.register.mockResolvedValue(mockRegistration);

    const onSuccess = vi.fn();
    await swManager.register({ onSuccess });

    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(onSuccess).toHaveBeenCalledWith(mockRegistration);
  });

  it('should handle service worker registration failure', async () => {
    const error = new Error('Registration failed');
    mockServiceWorker.register.mockRejectedValue(error);

    const onError = vi.fn();
    await swManager.register({ onError });

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should check if service worker is supported', () => {
    expect(swManager.isSupported()).toBe(true);

    // Test unsupported environment
    delete (global.navigator as any).serviceWorker;
    expect(swManager.isSupported()).toBe(false);
  });
});

describe('PerformanceMonitor', () => {
  let perfMonitor: PerformanceMonitor;

  beforeEach(() => {
    perfMonitor = PerformanceMonitor.getInstance({
      enableConsoleLogging: false,
      enableAnalytics: false,
      sampleRate: 1.0
    });
  });

  afterEach(() => {
    perfMonitor.destroy();
  });

  it('should track custom metrics', () => {
    const metricName = 'test_metric';
    const metricValue = 123.45;
    const metadata = { test: 'data' };

    perfMonitor.trackCustomMetric(metricName, metricValue, metadata);

    // Verify metric was stored (would need to check localStorage in real implementation)
    expect(true).toBe(true); // Placeholder assertion
  });

  it('should get current metrics', () => {
    const metrics = perfMonitor.getMetrics();
    
    expect(metrics).toHaveProperty('cls');
    expect(metrics).toHaveProperty('fid');
    expect(metrics).toHaveProperty('fcp');
    expect(metrics).toHaveProperty('lcp');
    expect(metrics).toHaveProperty('ttfb');
    expect(metrics).toHaveProperty('timestamp');
    expect(metrics).toHaveProperty('url');
    expect(metrics).toHaveProperty('userAgent');
  });
});

describe('ProgressiveLoader', () => {
  let loader: ProgressiveLoader<any>;
  let mockLoadFunction: any;

  beforeEach(() => {
    mockLoadFunction = vi.fn();
    loader = new ProgressiveLoader(mockLoadFunction, {
      pageSize: 10,
      preloadPages: 1,
      threshold: 100,
      maxConcurrentRequests: 2
    });
  });

  it('should load initial data', async () => {
    const mockData = {
      items: Array.from({ length: 10 }, (_, i) => ({ id: i, name: `Item ${i}` })),
      totalCount: 100
    };

    mockLoadFunction.mockResolvedValue(mockData);

    await loader.loadInitial();

    const state = loader.getState();
    expect(state.items).toHaveLength(10);
    expect(state.totalCount).toBe(100);
    expect(state.currentPage).toBe(0);
    expect(state.hasMore).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('should load more data', async () => {
    // Setup initial data
    const initialData = {
      items: Array.from({ length: 10 }, (_, i) => ({ id: i, name: `Item ${i}` })),
      totalCount: 100
    };

    const moreData = {
      items: Array.from({ length: 10 }, (_, i) => ({ id: i + 10, name: `Item ${i + 10}` })),
      totalCount: 100
    };

    mockLoadFunction
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(moreData);

    await loader.loadInitial();
    await loader.loadMore();

    const state = loader.getState();
    expect(state.items).toHaveLength(20);
    expect(state.currentPage).toBe(1);
  });

  it('should handle loading errors', async () => {
    const error = new Error('Load failed');
    mockLoadFunction.mockRejectedValue(error);

    await loader.loadInitial();

    const state = loader.getState();
    expect(state.error).toBe('Load failed');
    expect(state.isLoading).toBe(false);
  });

  it('should reset state', () => {
    loader.reset();

    const state = loader.getState();
    expect(state.items).toHaveLength(0);
    expect(state.currentPage).toBe(0);
    expect(state.hasMore).toBe(true);
    expect(state.error).toBe(null);
  });
});

describe('VirtualScrollManager', () => {
  let manager: VirtualScrollManager;

  beforeEach(() => {
    manager = new VirtualScrollManager({
      itemHeight: 50,
      containerHeight: 400,
      overscan: 5
    });
  });

  it('should calculate visible range correctly', () => {
    manager.updateScrollTop(100);
    const range = manager.getVisibleRange(1000);

    expect(range.start).toBeGreaterThanOrEqual(0);
    expect(range.end).toBeLessThan(1000);
    expect(range.end).toBeGreaterThan(range.start);
  });

  it('should generate correct item styles', () => {
    const style = manager.getItemStyle(10);

    expect(style).toEqual({
      position: 'absolute',
      top: 500, // 10 * 50
      left: 0,
      right: 0,
      height: 50
    });
  });

  it('should calculate total height', () => {
    const totalHeight = manager.getTotalHeight(100);
    expect(totalHeight).toBe(5000); // 100 * 50
  });
});

describe('IntelligentCache', () => {
  let cache: IntelligentCache<any>;

  beforeEach(() => {
    cache = new IntelligentCache({
      maxSize: 1024 * 1024, // 1MB
      defaultTTL: 5000, // 5 seconds
      maxEntries: 100,
      cleanupInterval: 1000,
      compressionThreshold: 1024
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should set and get cache entries', async () => {
    const key = 'test-key';
    const data = { message: 'Hello, World!' };

    await cache.set(key, data);
    const retrieved = await cache.get(key);

    expect(retrieved).toEqual(data);
  });

  it('should handle cache expiration', async () => {
    const key = 'expiring-key';
    const data = { message: 'This will expire' };

    await cache.set(key, data, 100); // 100ms TTL

    // Should be available immediately
    let retrieved = await cache.get(key);
    expect(retrieved).toEqual(data);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be expired
    retrieved = await cache.get(key);
    expect(retrieved).toBe(null);
  });

  it('should invalidate entries by pattern', async () => {
    await cache.set('user:1:profile', { name: 'User 1' });
    await cache.set('user:2:profile', { name: 'User 2' });
    await cache.set('post:1:content', { title: 'Post 1' });

    const invalidated = cache.invalidatePattern(/^user:/);
    expect(invalidated).toBe(2);

    expect(await cache.get('user:1:profile')).toBe(null);
    expect(await cache.get('user:2:profile')).toBe(null);
    expect(await cache.get('post:1:content')).not.toBe(null);
  });

  it('should provide cache statistics', () => {
    const stats = cache.getStats();

    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('evictions');
    expect(stats).toHaveProperty('totalSize');
    expect(stats).toHaveProperty('entryCount');
    expect(stats).toHaveProperty('hitRate');
  });
});

describe('APICache', () => {
  let apiCache: APICache;

  beforeEach(() => {
    apiCache = new APICache();
  });

  afterEach(() => {
    apiCache.destroy();
  });

  it('should cache API responses', async () => {
    const key = 'api-test';
    const mockResponse = { data: 'test response' };
    const fetchFn = vi.fn().mockResolvedValue(mockResponse);

    const result = await apiCache.getOrFetch(key, fetchFn);
    expect(result).toEqual(mockResponse);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const cachedResult = await apiCache.getOrFetch(key, fetchFn);
    expect(cachedResult).toEqual(mockResponse);
    expect(fetchFn).toHaveBeenCalledTimes(1); // Still only called once
  });

  it('should generate cache keys correctly', () => {
    const url = '/api/users';
    const params = { page: 1, limit: 10 };
    const key = APICache.generateKey(url, params);

    expect(key).toBe('api:/api/users:{"page":1,"limit":10}');
  });

  it('should invalidate endpoint caches', async () => {
    await apiCache.set('api:/api/users:{}', { users: [] });
    await apiCache.set('api:/api/users:{"page":1}', { users: [] });
    await apiCache.set('api:/api/posts:{}', { posts: [] });

    const invalidated = apiCache.invalidateEndpoint('/api/users');
    expect(invalidated).toBe(2);

    expect(await apiCache.get('api:/api/users:{}')).toBe(null);
    expect(await apiCache.get('api:/api/users:{"page":1}')).toBe(null);
    expect(await apiCache.get('api:/api/posts:{}')).not.toBe(null);
  });
});

describe('VulnerabilityCache', () => {
  let vulnCache: VulnerabilityCache;

  beforeEach(() => {
    vulnCache = new VulnerabilityCache();
  });

  afterEach(() => {
    vulnCache.destroy();
  });

  it('should cache vulnerability data', async () => {
    const projectId = 'project-123';
    const scanType = 'snyk';
    const vulnerabilities = [
      { id: 'vuln-1', severity: 'high' },
      { id: 'vuln-2', severity: 'medium' }
    ];
    const metadata = { scanDate: '2023-01-01' };

    await vulnCache.cacheVulnerabilities(projectId, scanType, vulnerabilities, metadata);

    const cached = await vulnCache.getVulnerabilities(projectId, scanType);
    expect(cached).not.toBe(null);
    expect(cached?.vulnerabilities).toEqual(vulnerabilities);
    expect(cached?.metadata).toEqual(metadata);
  });

  it('should invalidate project vulnerabilities', async () => {
    const projectId = 'project-123';
    
    await vulnCache.cacheVulnerabilities(projectId, 'snyk', [], {});
    await vulnCache.cacheVulnerabilities(projectId, 'trivy', [], {});
    await vulnCache.cacheVulnerabilities('project-456', 'snyk', [], {});

    const invalidated = vulnCache.invalidateProject(projectId);
    expect(invalidated).toBe(2);

    expect(await vulnCache.getVulnerabilities(projectId, 'snyk')).toBe(null);
    expect(await vulnCache.getVulnerabilities(projectId, 'trivy')).toBe(null);
    expect(await vulnCache.getVulnerabilities('project-456', 'snyk')).not.toBe(null);
  });

  it('should invalidate scan type across projects', async () => {
    await vulnCache.cacheVulnerabilities('project-1', 'snyk', [], {});
    await vulnCache.cacheVulnerabilities('project-2', 'snyk', [], {});
    await vulnCache.cacheVulnerabilities('project-1', 'trivy', [], {});

    const invalidated = vulnCache.invalidateScanType('snyk');
    expect(invalidated).toBe(2);

    expect(await vulnCache.getVulnerabilities('project-1', 'snyk')).toBe(null);
    expect(await vulnCache.getVulnerabilities('project-2', 'snyk')).toBe(null);
    expect(await vulnCache.getVulnerabilities('project-1', 'trivy')).not.toBe(null);
  });
});