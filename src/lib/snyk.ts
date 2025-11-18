import { toast } from 'sonner';

export interface SnykVulnerability {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  packageName: string;
  version: string;
  fixedIn?: string;
  description: string;
  references: string[];
  cvssScore?: number;
  cwe?: string[];
  publishedDate?: Date;
  modificationDate?: Date;
  disclosureTime?: Date;
  exploitMaturity?: 'mature' | 'proof-of-concept' | 'no-known-exploit' | 'no-data';
  patches?: Array<{
    id: string;
    urls: string[];
    version: string;
    modificationTime: Date;
  }>;
  upgradePath?: string[];
  isUpgradable: boolean;
  isPatchable: boolean;
  language: string;
  packageManager: string;
}

export interface SnykTestResult {
  ok: boolean;
  vulnerabilities: SnykVulnerability[];
  dependencyCount: number;
  org: {
    name: string;
    id: string;
  };
  policy: string;
  isPrivate: boolean;
  licensesPolicy?: any;
  packageManager: string;
  ignoreSettings?: any;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  remediation?: {
    unresolved: SnykVulnerability[];
    upgrade: Record<string, {
      upgradeTo: string;
      upgrades: string[];
      vulns: string[];
    }>;
    patch: Record<string, {
      patched: string;
      vulns: string[];
    }>;
    ignore: Record<string, any>;
    pin: Record<string, any>;
  };
}

export interface SnykProject {
  name: string;
  id: string;
  created: Date;
  origin: string;
  type: string;
  readOnly: boolean;
  testFrequency: string;
  totalDependencies: number;
  issueCountsBySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  imageId?: string;
  imageTag?: string;
  imagePlatform?: string;
  lastTestedDate: Date;
  browseUrl: string;
  importingUser: {
    id: string;
    name: string;
    username: string;
    email: string;
  };
  isMonitored: boolean;
  branch?: string;
  targetFile?: string;
  tags?: Array<{
    key: string;
    value: string;
  }>;
}

export interface SnykOrganization {
  name: string;
  id: string;
  slug: string;
  url: string;
  created: Date;
  group?: {
    name: string;
    id: string;
  };
}

export interface SnykRateLimit {
  limit: number;
  remaining: number;
  reset: Date;
}

export interface SnykTestOptions {
  severityThreshold?: 'low' | 'medium' | 'high' | 'critical';
  ignorePolicy?: boolean;
  showVulnPaths?: 'all' | 'some' | 'none';
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'pipenv' | 'poetry' | 'maven' | 'gradle' | 'sbt' | 'go' | 'composer' | 'rubygems' | 'cocoapods' | 'swift' | 'nuget';
  targetFile?: string;
  allProjects?: boolean;
  failOn?: 'all' | 'upgradable' | 'patchable';
  includeBase?: boolean;
  excludeBase?: boolean;
}

export interface SnykMonitorOptions {
  targetFile?: string;
  allProjects?: boolean;
  projectName?: string;
  targetReference?: string;
  tags?: string;
  projectEnvironment?: string[];
  projectLifecycle?: string[];
  projectBusinessCriticality?: string[];
}

export class SnykClient {
  private apiToken: string;
  private baseUrl: string = 'https://api.snyk.io/v1';
  private rateLimitInfo: SnykRateLimit | null = null;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  // Rate limiting helpers
  private async handleRateLimit(): Promise<void> {
    if (this.rateLimitInfo && this.rateLimitInfo.remaining < 10) {
      const waitTime = this.rateLimitInfo.reset.getTime() - Date.now();
      
      if (waitTime > 0) {
        toast.warning(`Snyk rate limit approaching. Waiting ${Math.ceil(waitTime / 1000 / 60)} minutes.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  private updateRateLimitFromHeaders(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: new Date(parseInt(reset) * 1000)
      };
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.handleRateLimit();

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `token ${this.apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DevSecOps-Pipeline/1.0.0',
        ...options.headers,
      },
    });

    this.updateRateLimitFromHeaders(response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Snyk API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Use default error message
      }

      if (response.status === 401) {
        throw new Error('Invalid Snyk API token. Please check your authentication.');
      } else if (response.status === 403) {
        throw new Error('Access forbidden. Check your Snyk API token permissions.');
      } else if (response.status === 429) {
        throw new Error('Snyk API rate limit exceeded. Please try again later.');
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data as T;
  }

  // Authentication and user info
  async validateToken(): Promise<boolean> {
    try {
      await this.getUser();
      return true;
    } catch {
      return false;
    }
  }

  async getUser(): Promise<any> {
    return await this.makeRequest('/user/me');
  }

  // Organization methods
  async getOrganizations(): Promise<SnykOrganization[]> {
    const response = await this.makeRequest<{ orgs: SnykOrganization[] }>('/orgs');
    return response.orgs;
  }

  async getOrganization(orgId: string): Promise<SnykOrganization> {
    return await this.makeRequest<SnykOrganization>(`/org/${orgId}`);
  }

  // Project methods
  async getProjects(orgId: string): Promise<SnykProject[]> {
    const response = await this.makeRequest<{ projects: SnykProject[] }>(`/org/${orgId}/projects`);
    return response.projects;
  }

  async getProject(orgId: string, projectId: string): Promise<SnykProject> {
    return await this.makeRequest<SnykProject>(`/org/${orgId}/project/${projectId}`);
  }

  async deleteProject(orgId: string, projectId: string): Promise<void> {
    await this.makeRequest(`/org/${orgId}/project/${projectId}`, {
      method: 'DELETE'
    });
  }

  // Testing methods
  async testDependencies(
    orgId: string,
    packageManager: string,
    dependencies: Record<string, string>,
    options: SnykTestOptions = {}
  ): Promise<SnykTestResult> {
    const body = {
      packageManager,
      files: {
        target: {
          contents: JSON.stringify(dependencies)
        }
      },
      ...options
    };

    return await this.makeRequest<SnykTestResult>(`/test/${packageManager}`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async testNpmPackage(
    packageName: string,
    version: string,
    orgId?: string,
    options: SnykTestOptions = {}
  ): Promise<SnykTestResult> {
    const endpoint = `/test/npm/${packageName}/${version}`;
    const params = new URLSearchParams();
    
    if (orgId) params.append('org', orgId);
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const url = params.toString() ? `${endpoint}?${params}` : endpoint;
    return await this.makeRequest<SnykTestResult>(url);
  }

  async testPythonPackage(
    packageName: string,
    version: string,
    orgId?: string,
    options: SnykTestOptions = {}
  ): Promise<SnykTestResult> {
    const endpoint = `/test/pip/${packageName}/${version}`;
    const params = new URLSearchParams();
    
    if (orgId) params.append('org', orgId);
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const url = params.toString() ? `${endpoint}?${params}` : endpoint;
    return await this.makeRequest<SnykTestResult>(url);
  }

  async testMavenPackage(
    groupId: string,
    artifactId: string,
    version: string,
    orgId?: string,
    options: SnykTestOptions = {}
  ): Promise<SnykTestResult> {
    const endpoint = `/test/maven/${groupId}/${artifactId}/${version}`;
    const params = new URLSearchParams();
    
    if (orgId) params.append('org', orgId);
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const url = params.toString() ? `${endpoint}?${params}` : endpoint;
    return await this.makeRequest<SnykTestResult>(url);
  }

  // Monitoring methods
  async monitorDependencies(
    orgId: string,
    packageManager: string,
    dependencies: Record<string, string>,
    options: SnykMonitorOptions = {}
  ): Promise<{ id: string; uri: string; isMonitored: boolean }> {
    const body = {
      packageManager,
      files: {
        target: {
          contents: JSON.stringify(dependencies)
        }
      },
      ...options
    };

    return await this.makeRequest<{ id: string; uri: string; isMonitored: boolean }>(
      `/monitor/${packageManager}`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  }

  // Vulnerability methods
  async getVulnerability(vulnId: string): Promise<SnykVulnerability> {
    return await this.makeRequest<SnykVulnerability>(`/vuln/${vulnId}`);
  }

  async getProjectVulnerabilities(
    orgId: string,
    projectId: string,
    options: {
      severityThreshold?: 'low' | 'medium' | 'high' | 'critical';
      ignorePolicy?: boolean;
      includeDescription?: boolean;
      includeIntroducedThrough?: boolean;
    } = {}
  ): Promise<{ vulnerabilities: SnykVulnerability[] }> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const url = params.toString() 
      ? `/org/${orgId}/project/${projectId}/issues?${params}`
      : `/org/${orgId}/project/${projectId}/issues`;

    return await this.makeRequest<{ vulnerabilities: SnykVulnerability[] }>(url);
  }

  // Utility methods
  getRateLimitInfo(): SnykRateLimit | null {
    return this.rateLimitInfo;
  }

  static parseMavenCoordinate(coordinate: string): { groupId: string; artifactId: string; version?: string } | null {
    const parts = coordinate.split(':');
    if (parts.length < 2) return null;
    
    return {
      groupId: parts[0],
      artifactId: parts[1],
      version: parts[2]
    };
  }

  static calculateSecurityScore(summary: SnykTestResult['summary']): number {
    if (summary.total === 0) return 100;
    
    // Weight vulnerabilities by severity
    const weightedScore = (
      summary.critical * 10 +
      summary.high * 7 +
      summary.medium * 4 +
      summary.low * 1
    );
    
    // Calculate score out of 100 (lower is better for vulnerabilities)
    const maxPossibleScore = summary.total * 10;
    const score = Math.max(0, 100 - (weightedScore / maxPossibleScore) * 100);
    
    return Math.round(score);
  }

  static getRiskLevel(summary: SnykTestResult['summary']): 'low' | 'medium' | 'high' | 'critical' {
    if (summary.critical > 0) return 'critical';
    if (summary.high > 5) return 'critical';
    if (summary.high > 0) return 'high';
    if (summary.medium > 10) return 'high';
    if (summary.medium > 0) return 'medium';
    return 'low';
  }
}

// Token management
export class SnykTokenManager {
  private static readonly TOKEN_KEY = 'snyk_token';
  private static readonly TOKEN_EXPIRY_KEY = 'snyk_token_expiry';

  static setToken(token: string, expiryHours: number = 24 * 30): void { // 30 days default
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + expiryHours);
    
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiry.toISOString());
  }

  static getToken(): string | null {
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
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  static isTokenExpired(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    
    return new Date() > new Date(expiry);
  }

  static getTokenExpiry(): Date | null {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    return expiry ? new Date(expiry) : null;
  }
}

// Create default client instance
export const createSnykClient = (token?: string): SnykClient => {
  const authToken = token || SnykTokenManager.getToken();
  if (!authToken) {
    throw new Error('Snyk API token is required');
  }
  return new SnykClient(authToken);
};