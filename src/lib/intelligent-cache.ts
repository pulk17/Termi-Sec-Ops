// Intelligent caching strategies with TTL, LRU, and smart invalidation

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
  compressionThreshold: number; // Compress entries larger than this size
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
}

export class IntelligentCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private compressionWorker: Worker | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxEntries: 1000,
      cleanupInterval: 60 * 1000, // 1 minute
      compressionThreshold: 10 * 1024, // 10KB
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
      hitRate: 0
    };

    this.startCleanupTimer();
    this.initCompressionWorker();
  }

  async set(
    key: string, 
    data: T, 
    ttl: number = this.config.defaultTTL
  ): Promise<void> {
    const size = this.calculateSize(data);
    const now = Date.now();

    // Check if we need to make space
    await this.ensureSpace(size);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    // Compress large entries
    if (size > this.config.compressionThreshold) {
      entry.data = await this.compress(data);
    }

    this.cache.set(key, entry);
    this.stats.totalSize += size;
    this.stats.entryCount++;
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();

    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    this.stats.hits++;
    this.updateHitRate();

    // Decompress if needed
    if (entry.size > this.config.compressionThreshold) {
      return await this.decompress(entry.data);
    }

    return entry.data;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.entryCount = 0;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  // Smart invalidation based on patterns
  invalidatePattern(pattern: string | RegExp): number {
    let invalidated = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  // Invalidate related entries (e.g., when a vulnerability is updated)
  invalidateRelated(key: string, relationshipFn: (k: string) => boolean): number {
    let invalidated = 0;

    for (const [cacheKey] of this.cache) {
      if (relationshipFn(cacheKey)) {
        this.delete(cacheKey);
        invalidated++;
      }
    }

    return invalidated;
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    // Check if we have enough space
    if (this.stats.totalSize + requiredSize <= this.config.maxSize && 
        this.stats.entryCount < this.config.maxEntries) {
      return;
    }

    // Evict entries using LRU + frequency strategy
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        // Combine recency and frequency for smarter eviction
        const aScore = a.entry.lastAccessed + (a.entry.accessCount * 1000);
        const bScore = b.entry.lastAccessed + (b.entry.accessCount * 1000);
        return aScore - bScore; // Ascending order (oldest/least used first)
      });

    let freedSpace = 0;
    let evicted = 0;

    for (const { key, entry } of entries) {
      if (this.stats.totalSize + requiredSize - freedSpace <= this.config.maxSize &&
          this.stats.entryCount - evicted < this.config.maxEntries) {
        break;
      }

      freedSpace += entry.size;
      evicted++;
      this.cache.delete(key);
      this.stats.evictions++;
    }

    this.stats.totalSize -= freedSpace;
    this.stats.entryCount -= evicted;
  }

  private calculateSize(data: T): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2; // Rough estimate for UTF-16
    }
  }

  private async compress(data: T): Promise<T> {
    if (!this.compressionWorker) {
      return data; // Fallback to uncompressed
    }

    try {
      // In a real implementation, you would use the compression worker
      // For now, we'll just return the data as-is
      return data;
    } catch (error) {
      console.warn('Compression failed:', error);
      return data;
    }
  }

  private async decompress(data: T): Promise<T> {
    if (!this.compressionWorker) {
      return data; // Fallback
    }

    try {
      // In a real implementation, you would use the compression worker
      return data;
    } catch (error) {
      console.warn('Decompression failed:', error);
      return data;
    }
  }

  private initCompressionWorker(): void {
    if (typeof Worker === 'undefined') {
      return; // No worker support
    }

    try {
      // In a real implementation, you would create a compression worker
      // this.compressionWorker = new Worker('/compression-worker.js');
    } catch (error) {
      console.warn('Failed to initialize compression worker:', error);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    let freedSize = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        freedSize += entry.size;
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.totalSize -= freedSize;
      this.stats.entryCount -= cleaned;
      console.log(`Cache cleanup: removed ${cleaned} expired entries, freed ${this.formatBytes(freedSize)}`);
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  getEntries(): Array<{ key: string; entry: CacheEntry<T> }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
  }

  // Export cache for persistence
  export(): Record<string, any> {
    const entries: Record<string, any> = {};
    
    for (const [key, entry] of this.cache) {
      entries[key] = {
        data: entry.data,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        size: entry.size
      };
    }

    return {
      entries,
      stats: this.stats,
      config: this.config
    };
  }

  // Import cache from persistence
  import(data: Record<string, any>): void {
    this.clear();
    
    if (data.entries) {
      for (const [key, entryData] of Object.entries(data.entries)) {
        this.cache.set(key, entryData as CacheEntry<T>);
      }
    }

    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }

    this.clear();
  }
}

// Specialized cache for API responses
export class APICache extends IntelligentCache<any> {
  constructor() {
    super({
      maxSize: 20 * 1024 * 1024, // 20MB for API responses
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxEntries: 500,
      cleanupInterval: 2 * 60 * 1000 // 2 minutes
    });
  }

  // Cache with request deduplication
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    try {
      const data = await fetchFn();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      // Don't cache errors, but still throw them
      throw error;
    }
  }

  // Generate cache key for API requests
  static generateKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `api:${url}:${paramString}`;
  }

  // Invalidate cache when data changes
  invalidateEndpoint(endpoint: string): number {
    return this.invalidatePattern(`^api:${endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  }
}

// Memory-efficient cache for large vulnerability datasets
export class VulnerabilityCache extends IntelligentCache<any> {
  constructor() {
    super({
      maxSize: 100 * 1024 * 1024, // 100MB for vulnerability data
      defaultTTL: 30 * 60 * 1000, // 30 minutes (vulnerabilities don't change often)
      maxEntries: 2000,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      compressionThreshold: 5 * 1024 // 5KB
    });
  }

  // Cache vulnerability scan results with smart invalidation
  async cacheVulnerabilities(
    projectId: string,
    scanType: string,
    vulnerabilities: any[],
    metadata?: any
  ): Promise<void> {
    const key = `vuln:${projectId}:${scanType}`;
    const data = {
      vulnerabilities,
      metadata,
      scanDate: new Date().toISOString()
    };

    await this.set(key, data, 60 * 60 * 1000); // 1 hour TTL for vulnerability data
  }

  // Get cached vulnerabilities
  async getVulnerabilities(
    projectId: string,
    scanType: string
  ): Promise<{ vulnerabilities: any[]; metadata?: any; scanDate: string } | null> {
    const key = `vuln:${projectId}:${scanType}`;
    return await this.get(key);
  }

  // Invalidate all vulnerability data for a project
  invalidateProject(projectId: string): number {
    return this.invalidatePattern(`^vuln:${projectId}:`);
  }

  // Invalidate specific scan type across all projects
  invalidateScanType(scanType: string): number {
    return this.invalidatePattern(`:${scanType}$`);
  }
}