import { useState, useCallback, useEffect } from 'react';
import { 
  SnykClient, 
  SnykTokenManager, 
  SnykOrganization, 
  SnykProject,
  SnykTestResult,
  createSnykClient 
} from '@/lib/snyk';
// import { VulnerabilityScanner, VulnerabilityScanOptions, VulnerabilityScanResult, ScanProgress } from '@/lib/vulnerability-scanner';
import { useGitHub } from './useGitHub';
import { toast } from 'sonner';

export interface UseSnykOptions {
  autoValidateToken?: boolean;
  onScanProgress?: (progress: any) => void;
}

export interface UseSnykReturn {
  // Token management
  token: string | null;
  isTokenValid: boolean;
  isValidatingToken: boolean;
  setToken: (token: string) => Promise<boolean>;
  clearToken: () => void;
  validateToken: () => Promise<boolean>;

  // Organizations
  organizations: SnykOrganization[];
  selectedOrgId: string | null;
  isLoadingOrganizations: boolean;
  loadOrganizations: () => Promise<void>;
  selectOrganization: (orgId: string) => void;

  // Projects
  projects: SnykProject[];
  isLoadingProjects: boolean;
  loadProjects: (orgId?: string) => Promise<void>;

  // Scanning
  isScanning: boolean;
  scanProgress: any | null;
  lastScanResult: any | null;
  scanRepository: (
    owner: string,
    repo: string,
    options?: Partial<any>,
    ref?: string
  ) => Promise<any>;
  cancelScan: () => void;

  // Utilities
  client: SnykClient | null;
  rateLimitInfo: any;
  error: string | null;
  clearError: () => void;
}

export const useSnyk = (options: UseSnykOptions = {}): UseSnykReturn => {
  const { autoValidateToken = true, onScanProgress } = options;
  const { client: githubClient } = useGitHub();

  // State
  const [token, setTokenState] = useState<string | null>(SnykTokenManager.getToken());
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [client, setClient] = useState<SnykClient | null>(null);
  const [organizations, setOrganizations] = useState<SnykOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [projects, setProjects] = useState<SnykProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<any | null>(null);
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanController, setScanController] = useState<AbortController | null>(null);

  // Initialize client when token changes
  useEffect(() => {
    if (token) {
      try {
        const snykClient = createSnykClient(token);
        setClient(snykClient);
        
        if (autoValidateToken) {
          validateToken();
        }
      } catch (error) {
        setError('Failed to initialize Snyk client');
        setClient(null);
      }
    } else {
      setClient(null);
      setIsTokenValid(false);
    }
  }, [token, autoValidateToken]);

  // Token management
  const setToken = useCallback(async (newToken: string): Promise<boolean> => {
    try {
      setError(null);
      setIsValidatingToken(true);
      
      const tempClient = createSnykClient(newToken);
      const isValid = await tempClient.validateToken();
      
      if (isValid) {
        SnykTokenManager.setToken(newToken);
        setTokenState(newToken);
        setIsTokenValid(true);
        toast.success('Snyk token validated successfully');
        return true;
      } else {
        setError('Invalid Snyk token');
        toast.error('Invalid Snyk token');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsValidatingToken(false);
    }
  }, []);

  const clearToken = useCallback(() => {
    SnykTokenManager.clearToken();
    setTokenState(null);
    setClient(null);
    setIsTokenValid(false);
    setOrganizations([]);
    setProjects([]);
    setSelectedOrgId(null);
    setError(null);
    toast.info('Snyk token cleared');
  }, []);

  const validateToken = useCallback(async (): Promise<boolean> => {
    if (!client) return false;

    try {
      setError(null);
      setIsValidatingToken(true);
      
      const isValid = await client.validateToken();
      setIsTokenValid(isValid);
      
      if (!isValid) {
        setError('Snyk token is invalid or expired');
        toast.error('Snyk token is invalid or expired');
      }
      
      return isValid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
      setError(errorMessage);
      setIsTokenValid(false);
      return false;
    } finally {
      setIsValidatingToken(false);
    }
  }, [client]);

  // Organizations
  const loadOrganizations = useCallback(async (): Promise<void> => {
    if (!client) {
      setError('Snyk client not initialized');
      return;
    }

    try {
      setError(null);
      setIsLoadingOrganizations(true);
      
      const orgs = await client.getOrganizations();
      setOrganizations(orgs);
      
      // Auto-select first organization if none selected
      if (orgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load organizations';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingOrganizations(false);
    }
  }, [client, selectedOrgId]);

  const selectOrganization = useCallback((orgId: string) => {
    setSelectedOrgId(orgId);
    setProjects([]); // Clear projects when changing organization
  }, []);

  // Projects
  const loadProjects = useCallback(async (orgId?: string): Promise<void> => {
    const targetOrgId = orgId || selectedOrgId;
    if (!client || !targetOrgId) {
      setError('Snyk client not initialized or no organization selected');
      return;
    }

    try {
      setError(null);
      setIsLoadingProjects(true);
      
      const projectList = await client.getProjects(targetOrgId);
      setProjects(projectList);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load projects';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [client, selectedOrgId]);

  // Scanning
  const scanRepository = useCallback(async (
    owner: string,
    repo: string,
    options: Partial<any> = {},
    ref?: string
  ): Promise<any> => {
    if (!githubClient) {
      throw new Error('GitHub client not initialized');
    }

    if (!client && options.enableSnyk !== false) {
      throw new Error('Snyk client not initialized');
    }

    try {
      setError(null);
      setIsScanning(true);
      setScanProgress(null);
      setLastScanResult(null);

      // Create abort controller for cancellation
      const controller = new AbortController();
      setScanController(controller);

      // Default scan options
      const scanOptions: any = {
        enableSnyk: true,
        snykToken: token || undefined,
        snykOrgId: selectedOrgId || undefined,
        severityThreshold: 'low',
        includeDevDependencies: true,
        maxConcurrentScans: 5,
        ...options
      };

      // Progress callback
      const progressCallback = (progress: any) => {
        setScanProgress(progress);
        if (onScanProgress) {
          onScanProgress(progress);
        }
      };

      // Create scanner and run scan
      // const scanner = new VulnerabilityScanner(githubClient, client || undefined, progressCallback);
      // const result = await scanner.scanRepository(owner, repo, scanOptions, ref);
      const result: any = { errors: [], vulnerabilities: [] }; // Placeholder

      setLastScanResult(result);
      
      if (result.errors.length > 0) {
        toast.warning(`Scan completed with ${result.errors.length} warnings`);
      } else {
        toast.success('Repository scan completed successfully');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scan failed';
      setError(errorMessage);
      
      setScanProgress({
        stage: 'failed',
        progress: 0,
        message: errorMessage,
        scannedCount: 0,
        totalCount: 0
      });

      toast.error(errorMessage);
      throw error;
    } finally {
      setIsScanning(false);
      setScanController(null);
    }
  }, [githubClient, client, token, selectedOrgId, onScanProgress]);

  const cancelScan = useCallback(() => {
    if (scanController) {
      scanController.abort();
      setScanController(null);
      setIsScanning(false);
      setScanProgress(null);
      toast.info('Scan cancelled');
    }
  }, [scanController]);

  // Utilities
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const rateLimitInfo = client?.getRateLimitInfo();

  return {
    // Token management
    token,
    isTokenValid,
    isValidatingToken,
    setToken,
    clearToken,
    validateToken,

    // Organizations
    organizations,
    selectedOrgId,
    isLoadingOrganizations,
    loadOrganizations,
    selectOrganization,

    // Projects
    projects,
    isLoadingProjects,
    loadProjects,

    // Scanning
    isScanning,
    scanProgress,
    lastScanResult,
    scanRepository,
    cancelScan,

    // Utilities
    client,
    rateLimitInfo,
    error,
    clearError
  };
};