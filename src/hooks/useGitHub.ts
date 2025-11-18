'use client';

import { useState, useEffect, useCallback } from 'react';
import { GitHubClient, GitHubTokenManager, GitHubRepository, GitHubWorkflowRun, createGitHubClient } from '@/lib/github';
import { useSecureTokens, usePrivacyAnalytics } from '@/components/security-provider';
import { toast } from 'sonner';

// Hook for GitHub authentication
export function useGitHubAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<GitHubClient | null>(null);
  
  const { getGitHubToken, storeGitHubToken, removeToken } = useSecureTokens();
  const { trackFeatureUsed } = usePrivacyAnalytics();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = await getGitHubToken();
      if (storedToken) {
        try {
          const githubClient = createGitHubClient(storedToken);
          const userData = await githubClient.getAuthenticatedUser();
          setToken(storedToken);
          setUser(userData);
          setClient(githubClient);
          setIsAuthenticated(true);
          trackFeatureUsed('github_auth', 'auto_login');
        } catch (error) {
          // Token is invalid, clear it
          removeToken('github_token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (newToken: string) => {
    try {
      setLoading(true);
      const githubClient = createGitHubClient(newToken);
      const userData = await githubClient.getAuthenticatedUser();
      
      GitHubTokenManager.setToken(newToken);
      setToken(newToken);
      setUser(userData);
      setClient(githubClient);
      setIsAuthenticated(true);
      
      toast.success(`Welcome, ${userData.login}!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      toast.error('GitHub authentication failed', {
        description: errorMessage
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    GitHubTokenManager.clearToken();
    setToken(null);
    setUser(null);
    setClient(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  }, []);

  const refreshAuth = useCallback(async () => {
    if (!token) return;
    
    try {
      const client = createGitHubClient(token);
      const userData = await client.getAuthenticatedUser();
      setUser(userData);
    } catch (error) {
      // Token is invalid, logout
      logout();
    }
  }, [token, logout]);

  return {
    token,
    isAuthenticated,
    user,
    loading,
    client,
    login,
    logout,
    refreshAuth
  };
}

// Hook for repository operations
export function useGitHubRepository(owner?: string, repo?: string) {
  const [repository, setRepository] = useState<GitHubRepository | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepository = useCallback(async (repoOwner: string, repoName: string, token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const client = createGitHubClient(token);
      const repoData = await client.getRepository(repoOwner, repoName);
      
      setRepository(repoData);
      return repoData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repository';
      setError(errorMessage);
      toast.error('Failed to fetch repository', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchRepositories = useCallback(async (query: string, options: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}, token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const client = createGitHubClient(token);
      const result = await client.searchRepositories(query, options);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search repositories';
      setError(errorMessage);
      toast.error('Failed to search repositories', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserRepositories = useCallback(async (options: {
    visibility?: 'all' | 'public' | 'private';
    affiliation?: 'owner' | 'collaborator' | 'organization_member';
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}, token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const client = createGitHubClient(token);
      const repositories = await client.getUserRepositories(options);
      
      return repositories;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user repositories';
      setError(errorMessage);
      toast.error('Failed to fetch repositories', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (owner && repo) {
      fetchRepository(owner, repo);
    }
  }, [owner, repo, fetchRepository]);

  return {
    repository,
    loading,
    error,
    fetchRepository,
    searchRepositories,
    getUserRepositories
  };
}

// Hook for repository content operations
export function useGitHubContent(owner?: string, repo?: string) {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async (repoOwner: string, repoName: string, path: string = '', ref?: string, token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const client = createGitHubClient(token);
      const contentData = await client.getRepositoryContent(repoOwner, repoName, path, ref);
      
      setContent(contentData);
      return contentData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repository content';
      setError(errorMessage);
      toast.error('Failed to fetch content', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFileContent = useCallback(async (repoOwner: string, repoName: string, path: string, ref?: string, token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const client = createGitHubClient(token);
      const fileContent = await client.getFileContent(repoOwner, repoName, path, ref);
      
      return fileContent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch file content';
      setError(errorMessage);
      toast.error('Failed to fetch file', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    content,
    loading,
    error,
    fetchContent,
    fetchFileContent
  };
}

// Hook for GitHub Actions workflows
export function useGitHubWorkflows(owner?: string, repo?: string) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<GitHubWorkflowRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async (repoOwner: string, repoName: string, token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const client = createGitHubClient(token);
      const workflowData = await client.getWorkflows(repoOwner, repoName);
      
      setWorkflows(workflowData);
      return workflowData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workflows';
      setError(errorMessage);
      toast.error('Failed to fetch workflows', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkflowRuns = useCallback(async (repoOwner: string, repoName: string, workflowId?: string | number, options: {
    actor?: string;
    branch?: string;
    event?: string;
    status?: 'completed' | 'action_required' | 'cancelled' | 'failure' | 'neutral' | 'skipped' | 'stale' | 'success' | 'timed_out' | 'in_progress' | 'queued' | 'requested' | 'waiting';
    per_page?: number;
    page?: number;
  } = {}, token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const client = createGitHubClient(token);
      const runs = await client.getWorkflowRuns(repoOwner, repoName, workflowId, options);
      
      setWorkflowRuns(runs);
      return runs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workflow runs';
      setError(errorMessage);
      toast.error('Failed to fetch workflow runs', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerWorkflow = useCallback(async (repoOwner: string, repoName: string, workflowId: string | number, ref: string, inputs?: Record<string, any>, token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const client = createGitHubClient(token);
      await client.createWorkflowDispatch(repoOwner, repoName, workflowId, ref, inputs);
      
      toast.success('Workflow triggered successfully');
      
      // Refresh workflow runs after a short delay
      setTimeout(() => {
        fetchWorkflowRuns(repoOwner, repoName, workflowId, {}, token);
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger workflow';
      setError(errorMessage);
      toast.error('Failed to trigger workflow', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkflowRuns]);

  const cancelWorkflowRun = useCallback(async (repoOwner: string, repoName: string, runId: number, token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const client = createGitHubClient(token);
      await client.cancelWorkflowRun(repoOwner, repoName, runId);
      
      toast.success('Workflow run cancelled');
      
      // Refresh workflow runs
      fetchWorkflowRuns(repoOwner, repoName, undefined, {}, token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel workflow run';
      setError(errorMessage);
      toast.error('Failed to cancel workflow run', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkflowRuns]);

  const getWorkflowRunLogs = useCallback(async (repoOwner: string, repoName: string, runId: number, token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const client = createGitHubClient(token);
      const logs = await client.getWorkflowRunLogs(repoOwner, repoName, runId);
      
      return logs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workflow logs';
      setError(errorMessage);
      toast.error('Failed to fetch logs', {
        description: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (owner && repo) {
      fetchWorkflows(owner, repo);
      fetchWorkflowRuns(owner, repo);
    }
  }, [owner, repo, fetchWorkflows, fetchWorkflowRuns]);

  return {
    workflows,
    workflowRuns,
    loading,
    error,
    fetchWorkflows,
    fetchWorkflowRuns,
    triggerWorkflow,
    cancelWorkflowRun,
    getWorkflowRunLogs
  };
}

// Hook for GitHub rate limiting
export function useGitHubRateLimit() {
  const [rateLimit, setRateLimit] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkRateLimit = useCallback(async (token?: string) => {
    try {
      setLoading(true);
      const client = createGitHubClient(token);
      const rateLimitInfo = await client.checkRateLimit();
      setRateLimit(rateLimitInfo);
      return rateLimitInfo;
    } catch (error) {
      console.error('Failed to check rate limit:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    rateLimit,
    loading,
    checkRateLimit
  };
}

// Main GitHub hook that combines all functionality
export function useGitHub() {
  const auth = useGitHubAuth();
  const rateLimit = useGitHubRateLimit();
  
  return {
    ...auth,
    client: auth.client,
    rateLimit: rateLimit.rateLimit,
    checkRateLimit: rateLimit.checkRateLimit,
    useRepository: useGitHubRepository,
    useContent: useGitHubContent,
    useWorkflows: useGitHubWorkflows,
  };
}