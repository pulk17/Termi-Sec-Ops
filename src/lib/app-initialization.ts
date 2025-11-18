import { db } from './database';
import { useScanStore } from '@/store/scan-store';
import { toast } from 'sonner';

export class AppInitializationService {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized || typeof window === 'undefined') return;

    try {
      console.log('Initializing DevSecOps Pipeline app...');

      // Clean up stale scans from previous sessions
      const cleanedUp = await db.cleanupStaleScans(5); // 5 minutes for startup cleanup
      if (cleanedUp > 0) {
        console.log(`Cleaned up ${cleanedUp} stale scans from previous session`);
        toast.info(`Cleaned up ${cleanedUp} interrupted scan(s) from previous session`);
      }

      // Clean up old scans from Zustand store (older than 7 days)
      useScanStore.getState().clearOldScans(7 * 24 * 60 * 60 * 1000);

      console.log('App initialization completed');
      this.initialized = true;

    } catch (error) {
      console.error('Failed to initialize app:', error);
      if (typeof window !== 'undefined') {
        toast.error('Failed to initialize application properly');
      }
    }
  }

  static async cleanup(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Cancel any running scans in Zustand store
      const { activeScans, cancelScan } = useScanStore.getState();
      for (const [scanId] of activeScans.entries()) {
        cancelScan(scanId);
      }

      this.initialized = false;
      console.log('App cleanup completed');

    } catch (error) {
      console.error('Failed to cleanup app:', error);
    }
  }
}

// Auto-initialize when imported in browser environment
if (typeof window !== 'undefined') {
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', () => {
    AppInitializationService.initialize();
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    AppInitializationService.cleanup();
  });

  // Also initialize immediately if DOM is already loaded
  if (document.readyState === 'loading') {
    // DOM is still loading
  } else {
    // DOM is already loaded
    AppInitializationService.initialize();
  }
}