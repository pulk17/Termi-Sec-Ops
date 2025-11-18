// Progressive loading utilities for large datasets

export interface ProgressiveLoadingConfig {
  pageSize: number;
  preloadPages: number;
  threshold: number; // Distance from bottom to trigger loading
  maxConcurrentRequests: number;
}

export interface LoadingState<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
}

export interface VirtualizedConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number; // Number of items to render outside visible area
}

export class ProgressiveLoader<T> {
  private config: ProgressiveLoadingConfig;
  private loadingState: LoadingState<T>;
  private loadFunction: (page: number, pageSize: number) => Promise<{ items: T[]; totalCount: number }>;
  private activeRequests = new Set<number>();
  private cache = new Map<number, T[]>();
  private observers: (() => void)[] = [];

  constructor(
    loadFunction: (page: number, pageSize: number) => Promise<{ items: T[]; totalCount: number }>,
    config: Partial<ProgressiveLoadingConfig> = {}
  ) {
    this.config = {
      pageSize: 50,
      preloadPages: 2,
      threshold: 200,
      maxConcurrentRequests: 3,
      ...config
    };

    this.loadFunction = loadFunction;
    this.loadingState = {
      items: [],
      isLoading: false,
      hasMore: true,
      error: null,
      totalCount: 0,
      currentPage: 0
    };
  }

  async loadInitial(): Promise<void> {
    if (this.loadingState.isLoading) return;

    this.setLoadingState({ isLoading: true, error: null });

    try {
      const result = await this.loadFunction(0, this.config.pageSize);
      
      this.cache.set(0, result.items);
      this.setLoadingState({
        items: result.items,
        totalCount: result.totalCount,
        currentPage: 0,
        hasMore: result.items.length === this.config.pageSize && result.items.length < result.totalCount,
        isLoading: false
      });

      // Preload next pages
      this.preloadPages();
    } catch (error) {
      this.setLoadingState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      });
    }
  }

  async loadMore(): Promise<void> {
    if (this.loadingState.isLoading || !this.loadingState.hasMore) return;

    const nextPage = this.loadingState.currentPage + 1;
    
    if (this.activeRequests.has(nextPage) || this.activeRequests.size >= this.config.maxConcurrentRequests) {
      return;
    }

    this.setLoadingState({ isLoading: true });

    try {
      let pageData = this.cache.get(nextPage);
      
      if (!pageData) {
        this.activeRequests.add(nextPage);
        const result = await this.loadFunction(nextPage, this.config.pageSize);
        pageData = result.items;
        this.cache.set(nextPage, pageData);
        this.activeRequests.delete(nextPage);
      }

      const newItems = [...this.loadingState.items, ...pageData];
      const hasMore = pageData.length === this.config.pageSize && 
                     newItems.length < this.loadingState.totalCount;

      this.setLoadingState({
        items: newItems,
        currentPage: nextPage,
        hasMore,
        isLoading: false
      });

      // Preload next pages
      this.preloadPages();
    } catch (error) {
      this.activeRequests.delete(nextPage);
      this.setLoadingState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load more data'
      });
    }
  }

  private async preloadPages(): Promise<void> {
    const currentPage = this.loadingState.currentPage;
    const maxPage = Math.ceil(this.loadingState.totalCount / this.config.pageSize) - 1;

    for (let i = 1; i <= this.config.preloadPages; i++) {
      const pageToLoad = currentPage + i;
      
      if (pageToLoad > maxPage || 
          this.cache.has(pageToLoad) || 
          this.activeRequests.has(pageToLoad) ||
          this.activeRequests.size >= this.config.maxConcurrentRequests) {
        continue;
      }

      this.activeRequests.add(pageToLoad);
      
      try {
        const result = await this.loadFunction(pageToLoad, this.config.pageSize);
        this.cache.set(pageToLoad, result.items);
      } catch (error) {
        console.warn(`Failed to preload page ${pageToLoad}:`, error);
      } finally {
        this.activeRequests.delete(pageToLoad);
      }
    }
  }

  private setLoadingState(updates: Partial<LoadingState<T>>): void {
    this.loadingState = { ...this.loadingState, ...updates };
    this.notifyObservers();
  }

  subscribe(callback: () => void): () => void {
    this.observers.push(callback);
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => callback());
  }

  getState(): LoadingState<T> {
    return { ...this.loadingState };
  }

  reset(): void {
    this.loadingState = {
      items: [],
      isLoading: false,
      hasMore: true,
      error: null,
      totalCount: 0,
      currentPage: 0
    };
    this.cache.clear();
    this.activeRequests.clear();
    this.notifyObservers();
  }

  // Get items for a specific range (useful for virtualization)
  getItemsInRange(startIndex: number, endIndex: number): T[] {
    return this.loadingState.items.slice(startIndex, endIndex + 1);
  }

  // Ensure items in range are loaded
  async ensureItemsLoaded(startIndex: number, endIndex: number): Promise<void> {
    const requiredPage = Math.floor(endIndex / this.config.pageSize);
    
    while (this.loadingState.currentPage < requiredPage && this.loadingState.hasMore) {
      await this.loadMore();
    }
  }
}

// Virtual scrolling utility for large lists
export class VirtualScrollManager {
  private config: VirtualizedConfig;
  private scrollTop = 0;
  private containerElement: HTMLElement | null = null;

  constructor(config: VirtualizedConfig) {
    this.config = config;
  }

  setContainer(element: HTMLElement): void {
    this.containerElement = element;
  }

  updateScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  getVisibleRange(totalItems: number): { start: number; end: number } {
    const visibleStart = Math.floor(this.scrollTop / this.config.itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(this.config.containerHeight / this.config.itemHeight),
      totalItems - 1
    );

    // Add overscan
    const start = Math.max(0, visibleStart - this.config.overscan);
    const end = Math.min(totalItems - 1, visibleEnd + this.config.overscan);

    return { start, end };
  }

  getItemStyle(index: number): React.CSSProperties {
    return {
      position: 'absolute',
      top: index * this.config.itemHeight,
      left: 0,
      right: 0,
      height: this.config.itemHeight
    };
  }

  getTotalHeight(totalItems: number): number {
    return totalItems * this.config.itemHeight;
  }

  scrollToItem(index: number): void {
    if (!this.containerElement) return;

    const targetScrollTop = index * this.config.itemHeight;
    this.containerElement.scrollTop = targetScrollTop;
  }
}

// Intersection Observer utility for triggering loads
export class IntersectionLoadTrigger {
  private observer: IntersectionObserver | null = null;
  private callback: () => void;
  private threshold: number;

  constructor(callback: () => void, threshold = 0.1) {
    this.callback = callback;
    this.threshold = threshold;
  }

  observe(element: HTMLElement): void {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      this.setupScrollListener(element);
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.callback();
          }
        });
      },
      { threshold: this.threshold }
    );

    this.observer.observe(element);
  }

  private setupScrollListener(element: HTMLElement): void {
    const container = element.closest('[data-scroll-container]') || window;
    
    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const containerHeight = container === window 
        ? window.innerHeight 
        : (container as HTMLElement).clientHeight;

      if (rect.top <= containerHeight) {
        this.callback();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Utility for chunked processing of large datasets
export class ChunkedProcessor<T, R> {
  private chunkSize: number;
  private delay: number;

  constructor(chunkSize = 100, delay = 10) {
    this.chunkSize = chunkSize;
    this.delay = delay;
  }

  async process(
    items: T[],
    processor: (item: T) => R,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    const total = items.length;

    for (let i = 0; i < total; i += this.chunkSize) {
      const chunk = items.slice(i, i + this.chunkSize);
      const chunkResults = chunk.map(processor);
      results.push(...chunkResults);

      onProgress?.(Math.min(i + this.chunkSize, total), total);

      // Yield control to prevent blocking the UI
      if (i + this.chunkSize < total) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    return results;
  }

  async processAsync(
    items: T[],
    processor: (item: T) => Promise<R>,
    onProgress?: (processed: number, total: number) => void,
    concurrency = 5
  ): Promise<R[]> {
    const results: R[] = [];
    const total = items.length;

    for (let i = 0; i < total; i += this.chunkSize) {
      const chunk = items.slice(i, i + this.chunkSize);
      
      // Process chunk with limited concurrency
      const chunkPromises = chunk.map((item, index) => 
        this.limitConcurrency(() => processor(item), concurrency)
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      onProgress?.(Math.min(i + this.chunkSize, total), total);

      // Small delay between chunks
      if (i + this.chunkSize < total) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    return results;
  }

  private async limitConcurrency<T>(
    fn: () => Promise<T>,
    limit: number
  ): Promise<T> {
    // Simple concurrency limiting - in production you might want a more sophisticated approach
    return fn();
  }
}