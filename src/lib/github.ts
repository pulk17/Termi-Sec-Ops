import { Octokit } from '@octokit/rest';
import { toast } from 'sonner';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
    type: string;
  };
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  visibility: 'public' | 'private';
  archived: boolean;
  disabled: boolean;
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: 'active' | 'deleted';
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  badge_url: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  path: string;
  display_title: string;
  run_number: number;
  event: string;
  status: 'queued' | 'in_progress' | 'completed' | 'cancelled';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  workflow_id: number;
  check_suite_id: number;
  check_suite_node_id: string;
  url: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  run_attempt: number;
  referenced_workflows: any[];
  run_started_at: string;
  triggering_actor: {
    login: string;
    avatar_url: string;
  };
  jobs_url: string;
  logs_url: string;
  check_suite_url: string;
  artifacts_url: string;
  cancel_url: string;
  rerun_url: string;
  previous_attempt_url: string | null;
  workflow_url: string;
  head_commit: {
    id: string;
    tree_id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
    committer: {
      name: string;
      email: string;
    };
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      avatar_url: string;
    };
  };
  head_repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      avatar_url: string;
    };
  };
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
  resource: string;
}

export class GitHubClient {
  private octokit: Octokit;
  private rateLimitInfo: GitHubRateLimit | null = null;
  private token?: string;

  constructor(token?: string) {
    this.token = token;
    this.octokit = new Octokit({
      auth: token,
      userAgent: 'DevSecOps-Pipeline/1.0.0',
      // Remove timeZone as it's not supported by GitHub API and causes CORS issues
    });
  }

  // Rate limiting helpers
  async checkRateLimit(): Promise<GitHubRateLimit> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      this.rateLimitInfo = { ...response.data.rate, resource: 'core' };
      return this.rateLimitInfo!;
    } catch (error) {
      console.error('Failed to check rate limit:', error);
      throw error;
    }
  }

  getRateLimitInfo(): GitHubRateLimit | null {
    return this.rateLimitInfo;
  }

  getToken(): string | undefined {
    return this.token;
  }

  private async handleRateLimit() {
    if (this.rateLimitInfo && this.rateLimitInfo.remaining < 10) {
      const resetTime = new Date(this.rateLimitInfo.reset * 1000);
      const waitTime = resetTime.getTime() - Date.now();
      
      if (waitTime > 0) {
        toast.warning(`Rate limit approaching. Waiting ${Math.ceil(waitTime / 1000 / 60)} minutes.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Repository operations
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      await this.handleRateLimit();
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      
      // Update rate limit info from response headers
      this.updateRateLimitFromHeaders(response.headers);
      
      return response.data as GitHubRepository;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found or not accessible`);
      } else if (error.status === 403) {
        throw new Error('Access forbidden. Check your GitHub token permissions.');
      } else if (error.status === 401) {
        throw new Error('Authentication failed. Please check your GitHub token.');
      }
      throw error;
    }
  }

  async searchRepositories(query: string, options: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<{ repositories: GitHubRepository[]; total_count: number }> {
    try {
      await this.handleRateLimit();
      const response = await this.octokit.rest.search.repos({
        q: query,
        sort: options.sort,
        order: options.order,
        per_page: options.per_page || 30,
        page: options.page || 1,
      });

      this.updateRateLimitFromHeaders(response.headers);

      return {
        repositories: response.data.items as GitHubRepository[],
        total_count: response.data.total_count,
      };
    } catch (error: any) {
      if (error.status === 422) {
        throw new Error('Invalid search query');
      }
      throw error;
    }
  }

  async getUserRepositories(options: {
    visibility?: 'all' | 'public' | 'private';
    affiliation?: 'owner' | 'collaborator' | 'organization_member';
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepository[]> {
    try {
      await this.handleRateLimit();
      const response = await this.octokit.rest.repos.listForAuthenticatedUser({
        visibility: options.visibility || 'all',
        affiliation: options.affiliation || 'owner,collaborator,organization_member',
        type: options.type || 'all',
        sort: options.sort || 'updated',
        direction: options.direction || 'desc',
        per_page: options.per_page || 100,
        page: options.page || 1,
      });

      this.updateRateLimitFromHeaders(response.headers);

      return response.data as GitHubRepository[];
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Authentication required to fetch user repositories');
      }
      throw error;
    }
  }

  // Content operations
  async getRepositoryContent(owner: string, repo: string, path: string = '', ref?: string): Promise<GitHubContent[]> {
    try {
      await this.handleRateLimit();
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      this.updateRateLimitFromHeaders(response.headers);

      // Handle both single file and directory responses
      const data = Array.isArray(response.data) ? response.data : [response.data];
      return data as GitHubContent[];
    } catch (error: any) {
      if (error.status === 404) {
        // Create a custom error with status property for better handling
        const notFoundError = new Error(`Path ${path} not found in repository`);
        (notFoundError as any).status = 404;
        throw notFoundError;
      }
      throw error;
    }
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    try {
      await this.handleRateLimit();
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      this.updateRateLimitFromHeaders(response.headers);

      const data = response.data as any;
      if (data.type !== 'file') {
        throw new Error(`${path} is not a file`);
      }

      if (data.encoding === 'base64') {
        return atob(data.content.replace(/\s/g, ''));
      }

      return data.content;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`File ${path} not found in repository`);
      }
      throw error;
    }
  }

  // Workflow operations
  async getWorkflows(owner: string, repo: string): Promise<GitHubWorkflow[]> {
    try {
      await this.handleRateLimit();
      const response = await this.octokit.rest.actions.listRepoWorkflows({
        owner,
        repo,
      });

      this.updateRateLimitFromHeaders(response.headers);

      return response.data.workflows as GitHubWorkflow[];
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Repository not found or workflows not accessible');
      }
      throw error;
    }
  }

  async createWorkflowDispatch(owner: string, repo: string, workflow_id: string | number, ref: string, inputs?: Record<string, any>): Promise<void> {
    try {
      await this.handleRateLimit();
      await this.octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id,
        ref,
        inputs,
      });
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Workflow not found or not accessible');
      } else if (error.status === 422) {
        throw new Error('Invalid workflow dispatch parameters');
      }
      throw error;
    }
  }

  async getWorkflowRuns(owner: string, repo: string, workflow_id?: string | number, options: {
    actor?: string;
    branch?: string;
    event?: string;
    status?: 'completed' | 'action_required' | 'cancelled' | 'failure' | 'neutral' | 'skipped' | 'stale' | 'success' | 'timed_out' | 'in_progress' | 'queued' | 'requested' | 'waiting';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubWorkflowRun[]> {
    try {
      await this.handleRateLimit();
      
      let response;
      if (workflow_id) {
        response = await this.octokit.rest.actions.listWorkflowRuns({
          owner,
          repo,
          workflow_id,
          actor: options.actor,
          branch: options.branch,
          event: options.event,
          status: options.status,
          per_page: options.per_page || 30,
          page: options.page || 1,
        });
      } else {
        response = await this.octokit.rest.actions.listWorkflowRunsForRepo({
          owner,
          repo,
          actor: options.actor,
          branch: options.branch,
          event: options.event,
          status: options.status,
          per_page: options.per_page || 30,
          page: options.page || 1,
        });
      }

      this.updateRateLimitFromHeaders(response.headers);

      return response.data.workflow_runs as GitHubWorkflowRun[];
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Repository or workflow not found');
      }
      throw error;
    }
  }

  async getWorkflowRun(owner: string, repo: string, run_id: number): Promise<GitHubWorkflowRun> {
    try {
      await this.handleRateLimit();
      const response = await this.octokit.rest.actions.getWorkflowRun({
        owner,
        repo,
        run_id,
      });

      this.updateRateLimitFromHeaders(response.headers);

      return response.data as GitHubWorkflowRun;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Workflow run not found');
      }
      throw error;
    }
  }

  async cancelWorkflowRun(owner: string, repo: string, run_id: number): Promise<void> {
    try {
      await this.handleRateLimit();
      await this.octokit.rest.actions.cancelWorkflowRun({
        owner,
        repo,
        run_id,
      });
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Workflow run not found');
      } else if (error.status === 409) {
        throw new Error('Cannot cancel workflow run in current state');
      }
      throw error;
    }
  }

  async getWorkflowRunLogs(owner: string, repo: string, run_id: number): Promise<ArrayBuffer> {
    try {
      await this.handleRateLimit();
      const response = await this.octokit.rest.actions.downloadWorkflowRunLogs({
        owner,
        repo,
        run_id,
      });

      this.updateRateLimitFromHeaders(response.headers);

      return response.data as ArrayBuffer;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Workflow run logs not found');
      }
      throw error;
    }
  }

  // Authentication helpers
  async getAuthenticatedUser() {
    try {
      await this.handleRateLimit();
      const response = await this.octokit.rest.users.getAuthenticated();
      
      this.updateRateLimitFromHeaders(response.headers);
      
      return response.data;
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Invalid or expired GitHub token');
      }
      throw error;
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.getAuthenticatedUser();
      return true;
    } catch {
      return false;
    }
  }

  // Utility methods
  private updateRateLimitFromHeaders(headers: any) {
    if (headers['x-ratelimit-limit']) {
      this.rateLimitInfo = {
        limit: parseInt(headers['x-ratelimit-limit']),
        remaining: parseInt(headers['x-ratelimit-remaining']),
        reset: parseInt(headers['x-ratelimit-reset']),
        used: parseInt(headers['x-ratelimit-used']),
        resource: headers['x-ratelimit-resource'] || 'core',
      };
    }
  }

  static parseRepositoryUrl(url: string): { owner: string; repo: string } | null {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== 'github.com') return null;
      
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length < 2) return null;
      
      return {
        owner: pathParts[0],
        repo: pathParts[1].replace(/\.git$/, ''),
      };
    } catch {
      return null;
    }
  }

  static isValidGitHubUrl(url: string): boolean {
    return GitHubClient.parseRepositoryUrl(url) !== null;
  }
}

// Token management
export class GitHubTokenManager {
  private static readonly TOKEN_KEY = 'github_token';
  private static readonly TOKEN_EXPIRY_KEY = 'github_token_expiry';

  static setToken(token: string, expiryHours: number = 24): void {
    if (typeof window === 'undefined') return;
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + expiryHours);
    
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiry.toISOString());
  }

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    if (new Date() > new Date(expiry)) {
      this.clearToken();
      return null;
    }
    
    return token;
  }

  static clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  static isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    
    return new Date() > new Date(expiry);
  }

  static getTokenExpiry(): Date | null {
    if (typeof window === 'undefined') return null;
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    return expiry ? new Date(expiry) : null;
  }
}

// Create default client instance
export const createGitHubClient = (token?: string): GitHubClient => {
  const authToken = token || GitHubTokenManager.getToken() || undefined;
  return new GitHubClient(authToken);
};