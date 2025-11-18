import { describe, it, expect } from 'vitest';

describe('SSR Safety', () => {
  it('should not throw errors when importing scan status service in SSR environment', () => {
    // Simulate SSR environment
    const originalWindow = global.window;
    delete (global as any).window;

    expect(() => {
      // This should not throw an error
      const { getScanStatusService } = require('@/lib/scan-status-service');
      
      // But calling it should throw a descriptive error
      expect(() => getScanStatusService()).toThrow('ScanStatusService can only be used in browser environment');
    }).not.toThrow();

    // Restore window
    global.window = originalWindow;
  });

  it('should handle app initialization service safely in SSR', async () => {
    // Simulate SSR environment
    const originalWindow = global.window;
    delete (global as any).window;

    const { AppInitializationService } = await import('@/lib/app-initialization');
    
    // Should not throw when called in SSR environment
    expect(async () => {
      await AppInitializationService.initialize();
      await AppInitializationService.cleanup();
    }).not.toThrow();

    // Restore window
    global.window = originalWindow;
  });

  it('should allow scan status service to work in browser environment', () => {
    // Ensure we're in browser environment
    if (typeof window === 'undefined') {
      global.window = {} as any;
    }

    const { getScanStatusService } = require('@/lib/scan-status-service');
    
    // Should not throw in browser environment
    expect(() => getScanStatusService()).not.toThrow();
  });
});