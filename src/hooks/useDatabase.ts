'use client';

import { useState, useEffect, useCallback } from 'react';
import { db, Project, ScanResult, UserPreferences } from '@/lib/database';
import { toast } from 'sonner';

// Custom hook for database operations
export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await db.open();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize database';
        setError(errorMessage);
        toast.error('Database initialization failed', {
          description: errorMessage
        });
      }
    };

    initializeDatabase();
  }, []);

  return { isInitialized, error };
}

// Hook for project operations
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const allProjects = await db.getAllProjects();
      setProjects(allProjects);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
      toast.error('Failed to load projects', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await db.createProject(projectData);
      await loadProjects(); // Refresh the list
      toast.success('Project created successfully');
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      toast.error('Failed to create project', {
        description: errorMessage
      });
      throw err;
    }
  }, [loadProjects]);

  const updateProject = useCallback(async (id: number, updates: Partial<Project>) => {
    try {
      await db.updateProject(id, updates);
      await loadProjects(); // Refresh the list
      toast.success('Project updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      toast.error('Failed to update project', {
        description: errorMessage
      });
      throw err;
    }
  }, [loadProjects]);

  const deleteProject = useCallback(async (id: number) => {
    try {
      await db.deleteProject(id);
      await loadProjects(); // Refresh the list
      toast.success('Project deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      toast.error('Failed to delete project', {
        description: errorMessage
      });
      throw err;
    }
  }, [loadProjects]);

  const getProjectByRepoUrl = useCallback(async (repoUrl: string) => {
    try {
      return await db.getProjectByRepoUrl(repoUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find project';
      toast.error('Failed to find project', {
        description: errorMessage
      });
      throw err;
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    getProjectByRepoUrl,
    refreshProjects: loadProjects
  };
}

// Hook for scan results operations
export function useScanResults(projectId?: number) {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScanResults = useCallback(async () => {
    try {
      setLoading(true);
      const results = projectId 
        ? await db.getProjectScanResults(projectId)
        : await db.scanResults.orderBy('startedAt').reverse().toArray();
      setScanResults(results);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load scan results';
      setError(errorMessage);
      toast.error('Failed to load scan results', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createScanResult = useCallback(async (scanData: Omit<ScanResult, 'id'>) => {
    try {
      const id = await db.createScanResult(scanData);
      await loadScanResults(); // Refresh the list
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create scan result';
      toast.error('Failed to create scan result', {
        description: errorMessage
      });
      throw err;
    }
  }, [loadScanResults]);

  const updateScanResult = useCallback(async (id: number, updates: Partial<ScanResult>) => {
    try {
      await db.updateScanResult(id, updates);
      await loadScanResults(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update scan result';
      toast.error('Failed to update scan result', {
        description: errorMessage
      });
      throw err;
    }
  }, [loadScanResults]);

  const updateScanResultByScanId = useCallback(async (scanId: string, updates: Partial<ScanResult>) => {
    try {
      await db.updateScanResultByScanId(scanId, updates);
      await loadScanResults(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update scan result';
      toast.error('Failed to update scan result', {
        description: errorMessage
      });
      throw err;
    }
  }, [loadScanResults]);

  const getScanResultByScanId = useCallback(async (scanId: string) => {
    try {
      return await db.getScanResultByScanId(scanId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find scan result';
      toast.error('Failed to find scan result', {
        description: errorMessage
      });
      throw err;
    }
  }, []);

  const getLatestScanResult = useCallback(async (projectId: number) => {
    try {
      return await db.getLatestScanResult(projectId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get latest scan result';
      toast.error('Failed to get latest scan result', {
        description: errorMessage
      });
      throw err;
    }
  }, []);

  useEffect(() => {
    loadScanResults();
  }, [loadScanResults]);

  return {
    scanResults,
    loading,
    error,
    createScanResult,
    updateScanResult,
    updateScanResultByScanId,
    getScanResultByScanId,
    getLatestScanResult,
    refreshScanResults: loadScanResults
  };
}

// Hook for user preferences
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const userPrefs = await db.getUserPreferences();
      setPreferences(userPrefs || null);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preferences';
      setError(errorMessage);
      toast.error('Failed to load preferences', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Omit<UserPreferences, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await db.createOrUpdateUserPreferences(newPreferences);
      await loadPreferences(); // Refresh
      toast.success('Preferences updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      toast.error('Failed to update preferences', {
        description: errorMessage
      });
      throw err;
    }
  }, [loadPreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refreshPreferences: loadPreferences
  };
}

// Hook for analytics and reporting
export function useAnalytics() {
  const [stats, setStats] = useState<{
    totalProjects: number;
    scannedProjects: number;
    totalScans: number;
    averageVulnerabilities: number;
    averageSecurityScore: number;
    averageCvssScore: number;
    mostVulnerableProject?: { project: Project; vulnerabilities: number };
  } | null>(null);
  const [trends, setTrends] = useState<Array<{
    date: Date;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (projectId?: number, days: number = 30) => {
    try {
      setLoading(true);
      const [projectStats, vulnerabilityTrends] = await Promise.all([
        db.getProjectStats(),
        db.getVulnerabilityTrends(projectId, days)
      ]);
      
      setStats(projectStats);
      setTrends(vulnerabilityTrends);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      toast.error('Failed to load analytics', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const getStorageUsage = useCallback(async () => {
    try {
      return await db.getStorageUsage();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get storage usage';
      toast.error('Failed to get storage usage', {
        description: errorMessage
      });
      throw err;
    }
  }, []);

  const cleanupOldScans = useCallback(async (daysToKeep: number = 90) => {
    try {
      const deletedCount = await db.cleanupOldScans(daysToKeep);
      toast.success(`Cleaned up ${deletedCount} old scan results`);
      return deletedCount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cleanup old scans';
      toast.error('Failed to cleanup old scans', {
        description: errorMessage
      });
      throw err;
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    stats,
    trends,
    loading,
    error,
    refreshAnalytics: loadAnalytics,
    getStorageUsage,
    cleanupOldScans
  };
}

// Hook for data export/import
export function useDataManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.exportData();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devsecops-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setError(errorMessage);
      toast.error('Failed to export data', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const importData = useCallback(async (file: File) => {
    try {
      setLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);
      
      await db.importData(data);
      
      toast.success('Data imported successfully');
      setError(null);
      
      // Refresh the page to reload all data
      window.location.reload();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import data';
      setError(errorMessage);
      toast.error('Failed to import data', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    exportData,
    importData
  };
}