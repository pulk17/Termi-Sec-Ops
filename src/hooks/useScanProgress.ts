import { useState, useEffect, useCallback } from 'react';
import { useScanStore, ScanProgress } from '@/store/scan-store';

export interface UseScanProgressOptions {
  scanId?: string;
  autoStart?: boolean;
  enableLogs?: boolean;
  logLevel?: 'info' | 'warn' | 'error' | 'debug';
  maxRetries?: number;
  retryDelay?: number;
}

export interface UseScanProgressReturn {
  // Current scan state
  scanId: string | null;
  isScanning: boolean;
  currentProgress: ScanProgress | null;
  
  // Progress tracking
  progress: number;
  stage: string;
  message: string;
  
  // Control methods
  startScan: (scanId: string, projectId: number) => void;
  updateProgress: (update: Partial<ScanProgress>) => void;
  cancelScan: () => void;
  
  // Utilities
  getProgressPercentage: () => number;
}

export const useScanProgress = (
  options: UseScanProgressOptions = {}
): UseScanProgressReturn => {
  const {
    scanId: initialScanId,
  } = options;

  const { activeScans, startScan: storeStartScan, updateProgress: storeUpdateProgress, cancelScan: storeCancelScan } = useScanStore();
  const [scanId, setScanId] = useState<string | null>(initialScanId || null);
  const currentProgress = scanId ? activeScans.get(scanId) || null : null;
  const isScanning = currentProgress !== null;

  // Start scan
  const startScan = useCallback((newScanId: string, projectId: number) => {
    setScanId(newScanId);
    storeStartScan(newScanId, projectId);
  }, [storeStartScan]);

  // Update progress
  const updateProgress = useCallback((update: Partial<ScanProgress>) => {
    if (scanId) {
      storeUpdateProgress(scanId, update);
    }
  }, [scanId, storeUpdateProgress]);

  // Cancel scan
  const cancelScan = useCallback(() => {
    if (scanId) {
      storeCancelScan(scanId);
    }
  }, [scanId, storeCancelScan]);

  // Utility methods
  const getProgressPercentage = useCallback((): number => {
    return currentProgress?.progress || 0;
  }, [currentProgress]);

  // Computed values
  const progress = currentProgress?.progress || 0;
  const stage = currentProgress?.stage || 'initializing';
  const message = currentProgress?.message || '';

  return {
    // Current scan state
    scanId,
    isScanning,
    currentProgress,
    
    // Progress tracking
    progress,
    stage,
    message,
    
    // Control methods
    startScan,
    updateProgress,
    cancelScan,
    
    // Utilities
    getProgressPercentage
  };
};