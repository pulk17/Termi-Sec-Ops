import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface ScanProgress {
  scanId: string;
  stage: 'initializing' | 'analyzing' | 'scanning' | 'reporting' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  currentTask?: string;
  timestamp: Date;
}

export interface ScanResult {
  scanId: string;
  projectId: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  vulnerabilities: any[];
  summary: {
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    securityScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

interface ScanState {
  // Active scans
  activeScans: Map<string, ScanProgress>;
  
  // Scan results
  scanResults: Map<string, ScanResult>;
  
  // Current scan being viewed
  currentScanId: string | null;
  
  // Actions
  startScan: (scanId: string, projectId: number) => void;
  updateProgress: (scanId: string, progress: Partial<ScanProgress>) => void;
  completeScan: (scanId: string, result: Omit<ScanResult, 'scanId' | 'projectId' | 'startedAt'>) => void;
  failScan: (scanId: string, error: string) => void;
  cancelScan: (scanId: string) => void;
  setCurrentScan: (scanId: string | null) => void;
  clearOldScans: (maxAge: number) => void;
  getScanProgress: (scanId: string) => ScanProgress | undefined;
  getScanResult: (scanId: string) => ScanResult | undefined;
}

export const useScanStore = create<ScanState>()(
  devtools(
    persist(
      (set, get) => ({
        activeScans: new Map(),
        scanResults: new Map(),
        currentScanId: null,

        startScan: (scanId, projectId) => {
          set((state) => {
            const newActiveScans = new Map(state.activeScans);
            newActiveScans.set(scanId, {
              scanId,
              stage: 'initializing',
              progress: 0,
              message: 'Initializing scan...',
              timestamp: new Date()
            });

            const newScanResults = new Map(state.scanResults);
            newScanResults.set(scanId, {
              scanId,
              projectId,
              status: 'running',
              vulnerabilities: [],
              summary: {
                totalVulnerabilities: 0,
                criticalCount: 0,
                highCount: 0,
                mediumCount: 0,
                lowCount: 0,
                securityScore: 100,
                riskLevel: 'low'
              },
              startedAt: new Date()
            });

            return {
              activeScans: newActiveScans,
              scanResults: newScanResults,
              currentScanId: scanId
            };
          });
        },

        updateProgress: (scanId, progress) => {
          set((state) => {
            const newActiveScans = new Map(state.activeScans);
            const existing = newActiveScans.get(scanId);
            
            if (existing) {
              newActiveScans.set(scanId, {
                ...existing,
                ...progress,
                timestamp: new Date()
              });
            }

            return { activeScans: newActiveScans };
          });
        },

        completeScan: (scanId, result) => {
          set((state) => {
            const newActiveScans = new Map(state.activeScans);
            newActiveScans.delete(scanId);

            const newScanResults = new Map(state.scanResults);
            const existing = newScanResults.get(scanId);
            
            if (existing) {
              newScanResults.set(scanId, {
                ...existing,
                ...result,
                status: 'completed',
                completedAt: new Date()
              });
            }

            return {
              activeScans: newActiveScans,
              scanResults: newScanResults
            };
          });
        },

        failScan: (scanId, error) => {
          set((state) => {
            const newActiveScans = new Map(state.activeScans);
            newActiveScans.delete(scanId);

            const newScanResults = new Map(state.scanResults);
            const existing = newScanResults.get(scanId);
            
            if (existing) {
              newScanResults.set(scanId, {
                ...existing,
                status: 'failed',
                error,
                completedAt: new Date()
              });
            }

            return {
              activeScans: newActiveScans,
              scanResults: newScanResults
            };
          });
        },

        cancelScan: (scanId) => {
          set((state) => {
            const newActiveScans = new Map(state.activeScans);
            newActiveScans.delete(scanId);

            const newScanResults = new Map(state.scanResults);
            const existing = newScanResults.get(scanId);
            
            if (existing) {
              newScanResults.set(scanId, {
                ...existing,
                status: 'cancelled',
                completedAt: new Date()
              });
            }

            return {
              activeScans: newActiveScans,
              scanResults: newScanResults
            };
          });
        },

        setCurrentScan: (scanId) => {
          set({ currentScanId: scanId });
        },

        clearOldScans: (maxAge) => {
          set((state) => {
            const cutoff = Date.now() - maxAge;
            const newScanResults = new Map(state.scanResults);
            
            for (const [scanId, result] of newScanResults.entries()) {
              if (result.completedAt && result.completedAt.getTime() < cutoff) {
                newScanResults.delete(scanId);
              }
            }

            return { scanResults: newScanResults };
          });
        },

        getScanProgress: (scanId) => {
          return get().activeScans.get(scanId);
        },

        getScanResult: (scanId) => {
          return get().scanResults.get(scanId);
        }
      }),
      {
        name: 'scan-storage',
        partialize: (state) => ({
          scanResults: Array.from(state.scanResults.entries()),
          currentScanId: state.currentScanId
        }),
        onRehydrateStorage: () => (state) => {
          if (state && Array.isArray(state.scanResults)) {
            state.scanResults = new Map(state.scanResults as any);
          }
        }
      }
    )
  )
);
