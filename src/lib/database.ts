import Dexie, { Table } from 'dexie';

// Database interfaces
export interface Project {
  id?: number;
  repoUrl: string;
  name: string;
  owner: string;
  description?: string;
  language?: string;
  isPrivate: boolean;
  lastScanned?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanResult {
  id?: number;
  projectId: number;
  scanId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  updatedAt?: Date;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  scanOptions: ScanOptions;
  results: ScanResultData;
  error?: string;
  progress?: {
    stage: string;
    percentage: number;
    message: string;
    currentTask?: string;
  };
}

export interface ScanOptions {
  enableOSV: boolean;
  enableNpmAudit: boolean;
  enableSnyk: boolean;
  enableTrivy?: boolean;
  enableAWSScanning?: boolean;
  enableGitHubActions: boolean;
  scanDependencies: boolean;
  scanCode: boolean;
  scanContainers: boolean;
}

export interface ScanResultData {
  snyk?: SnykResult[];
  osv?: OSVResult[];
  npmAudit?: NpmAuditResult[];
  trivy?: SnykResult[]; // Trivy uses same format as Snyk
  githubActions?: GitHubActionsResult;
  aws?: AWSResult[];
  summary: VulnerabilitySummary;
}

export interface SnykResult {
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
}

export interface OSVResult {
  id: string;
  summary: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affected: {
    package: {
      name: string;
      ecosystem: string;
    };
    ranges: Array<{
      type: string;
      events: Array<{
        introduced?: string;
        fixed?: string;
      }>;
    }>;
  }[];
  references: Array<{
    type: string;
    url: string;
  }>;
  published?: Date;
  modified?: Date;
}

export interface NpmAuditResult {
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  via: string[];
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
}

export interface GitHubActionsResult {
  workflowId: string;
  runId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'cancelled' | 'failure';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  logs?: string;
  artifacts?: Array<{
    name: string;
    downloadUrl: string;
    size: number;
  }>;
}

export interface AWSResult {
  service: string;
  resourceType: string;
  resourceId: string;
  findings: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
    description: string;
    remediation?: string;
  }>;
}

export interface VulnerabilitySummary {
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  fixableCount: number;
  securityScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface UserPreferences {
  id?: number;
  theme: 'light' | 'dark' | 'system';
  defaultScanOptions: ScanOptions;
  notifications: {
    browser: boolean;
    email: boolean;
    emailAddress?: string;
  };
  dashboard: {
    defaultView: 'overview' | 'vulnerabilities' | 'projects';
    itemsPerPage: number;
    autoRefresh: boolean;
    refreshInterval: number; // minutes
  };
  privacy: {
    shareAnalytics: boolean;
    storeLocally: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportData {
  version: string;
  exportedAt: Date;
  projects: Project[];
  scanResults: ScanResult[];
  userPreferences: UserPreferences[];
}

// Database class
export class DevSecOpsDatabase extends Dexie {
  projects!: Table<Project>;
  scanResults!: Table<ScanResult>;
  userPreferences!: Table<UserPreferences>;

  constructor() {
    super('DevSecOpsDatabase');
    
    this.version(1).stores({
      projects: '++id, repoUrl, name, owner, language, isPrivate, lastScanned, createdAt, updatedAt',
      scanResults: '++id, projectId, scanId, status, startedAt, completedAt, totalVulnerabilities, criticalCount, highCount, mediumCount, lowCount',
      userPreferences: '++id, theme, createdAt, updatedAt'
    });

    // Version 2: Add proper indexing for updatedAt queries
    this.version(2).stores({
      projects: '++id, repoUrl, name, owner, language, isPrivate, lastScanned, createdAt, updatedAt',
      scanResults: '++id, projectId, scanId, status, startedAt, completedAt, totalVulnerabilities, criticalCount, highCount, mediumCount, lowCount, updatedAt',
      userPreferences: '++id, theme, createdAt, updatedAt'
    }).upgrade(trans => {
      // Add updatedAt to existing scan results
      return trans.table('scanResults').toCollection().modify(scanResult => {
        if (!scanResult.updatedAt) {
          scanResult.updatedAt = scanResult.completedAt || scanResult.startedAt || new Date();
        }
      });
    });

    // Hooks for automatic timestamps
    this.projects.hook('creating', function (primKey, obj, trans) {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.projects.hook('updating', function (modifications, primKey, obj, trans) {
      (modifications as any).updatedAt = new Date();
    });

    this.userPreferences.hook('creating', function (primKey, obj, trans) {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.userPreferences.hook('updating', function (modifications, primKey, obj, trans) {
      (modifications as any).updatedAt = new Date();
    });

    // Add hooks for scan results
    this.scanResults.hook('creating', function (primKey, obj, trans) {
      obj.updatedAt = new Date();
    });

    this.scanResults.hook('updating', function (modifications, primKey, obj, trans) {
      (modifications as any).updatedAt = new Date();
    });
  }

  // Project methods
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return await this.projects.add(projectData as Project);
  }

  async getProject(id: number): Promise<Project | undefined> {
    return await this.projects.get(id);
  }

  async getProjectByUrl(repoUrl: string): Promise<Project | undefined> {
    return await this.projects.where('repoUrl').equals(repoUrl).first();
  }

  async getProjectByRepoUrl(repoUrl: string): Promise<Project | undefined> {
    return await this.projects.where('repoUrl').equals(repoUrl).first();
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.projects.orderBy('updatedAt').reverse().toArray();
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<number> {
    return await this.projects.update(id, updates);
  }

  async deleteProject(id: number): Promise<void> {
    await this.transaction('rw', this.projects, this.scanResults, async () => {
      await this.projects.delete(id);
      await this.scanResults.where('projectId').equals(id).delete();
    });
  }

  // Scan result methods
  async createScanResult(scanData: Omit<ScanResult, 'id'>): Promise<number> {
    return await this.scanResults.add(scanData as ScanResult);
  }

  async getScanResult(id: number): Promise<ScanResult | undefined> {
    return await this.scanResults.get(id);
  }

  async getScanResultByScanId(scanId: string): Promise<ScanResult | undefined> {
    return await this.scanResults.where('scanId').equals(scanId).first();
  }

  async getProjectScanResults(projectId: number): Promise<ScanResult[]> {
    return await this.scanResults
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('startedAt');
  }

  async getLatestScanResult(projectId: number): Promise<ScanResult | undefined> {
    const results = await this.scanResults
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('startedAt');
    return results[0];
  }

  async updateScanResult(id: number, updates: Partial<ScanResult>): Promise<number> {
    return await this.scanResults.update(id, updates);
  }

  async updateScanResultByScanId(scanId: string, updates: Partial<ScanResult>): Promise<number> {
    const scanResult = await this.getScanResultByScanId(scanId);
    if (!scanResult?.id) throw new Error('Scan result not found');
    return await this.scanResults.update(scanResult.id, updates);
  }

  async updateScanProgress(scanId: string, progress: {
    stage: string;
    percentage: number;
    message: string;
    currentTask?: string;
  }): Promise<void> {
    await this.updateScanResultByScanId(scanId, { 
      progress,
      status: progress.percentage >= 100 ? 'completed' : 'running'
    });
  }

  async cleanupStaleScans(maxAgeMinutes: number = 30): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - maxAgeMinutes);

    // Find scans that are still "running" or "queued" but haven't been updated recently
    const staleScans = await this.scanResults
      .where('status')
      .anyOf(['running', 'queued'])
      .and(scan => {
        const lastUpdate = scan.updatedAt || scan.startedAt;
        return lastUpdate < cutoffTime;
      })
      .toArray();

    // Mark them as failed
    let updatedCount = 0;
    for (const scan of staleScans) {
      if (scan.id) {
        await this.scanResults.update(scan.id, {
          status: 'failed',
          error: 'Scan timed out or was interrupted',
          completedAt: new Date()
        });
        updatedCount++;
      }
    }

    return updatedCount;
  }

  async getActiveScanResults(): Promise<ScanResult[]> {
    return await this.scanResults
      .where('status')
      .anyOf(['running', 'queued'])
      .toArray();
  }

  async deleteScanResult(id: number): Promise<void> {
    await this.scanResults.delete(id);
  }

  // User preferences methods
  async getUserPreferences(): Promise<UserPreferences | undefined> {
    return await this.userPreferences.orderBy('createdAt').last();
  }

  async createOrUpdateUserPreferences(preferences: Omit<UserPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const existing = await this.getUserPreferences();
    if (existing?.id) {
      await this.userPreferences.update(existing.id, preferences);
      return existing.id;
    } else {
      return await this.userPreferences.add(preferences as UserPreferences);
    }
  }

  // Analytics and reporting methods
  async getVulnerabilityTrends(projectId?: number, days: number = 30): Promise<Array<{
    date: Date;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let query = this.scanResults.where('completedAt').above(cutoffDate);
    if (projectId) {
      query = query.and(result => result.projectId === projectId);
    }

    const results = await query.toArray();
    
    // Group by date and aggregate
    const trendMap = new Map<string, {
      date: Date;
      critical: number;
      high: number;
      medium: number;
      low: number;
      total: number;
    }>();

    results.forEach(result => {
      if (!result.completedAt) return;
      
      const dateKey = result.completedAt.toISOString().split('T')[0];
      const existing = trendMap.get(dateKey) || {
        date: new Date(dateKey),
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0
      };

      existing.critical += result.criticalCount;
      existing.high += result.highCount;
      existing.medium += result.mediumCount;
      existing.low += result.lowCount;
      existing.total += result.totalVulnerabilities;

      trendMap.set(dateKey, existing);
    });

    return Array.from(trendMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getProjectStats(): Promise<{
    totalProjects: number;
    scannedProjects: number;
    totalScans: number;
    averageVulnerabilities: number;
    averageSecurityScore: number;
    averageCvssScore: number;
    mostVulnerableProject?: { project: Project; vulnerabilities: number };
  }> {
    const [projects, scanResults] = await Promise.all([
      this.getAllProjects(),
      this.scanResults.toArray()
    ]);

    const completedScans = scanResults.filter(scan => scan.status === 'completed');
    const scannedProjects = projects.filter(p => p.lastScanned).length;
    const totalVulnerabilities = completedScans.reduce((sum, scan) => sum + scan.totalVulnerabilities, 0);
    const averageVulnerabilities = completedScans.length > 0 ? totalVulnerabilities / completedScans.length : 0;

    // Calculate average security score
    const totalSecurityScore = completedScans.reduce((sum, scan) => {
      return sum + (scan.results?.summary?.securityScore || 0);
    }, 0);
    const averageSecurityScore = completedScans.length > 0 ? totalSecurityScore / completedScans.length : 0;

    // Calculate average CVSS score from all vulnerabilities
    let totalCvssScore = 0;
    let cvssCount = 0;
    
    completedScans.forEach(scan => {
      // Get CVSS scores from Snyk results
      if (scan.results?.snyk) {
        scan.results.snyk.forEach(vuln => {
          if (vuln.cvssScore) {
            totalCvssScore += vuln.cvssScore;
            cvssCount++;
          }
        });
      }
      // Get CVSS scores from Trivy results
      if (scan.results?.trivy) {
        scan.results.trivy.forEach(vuln => {
          if (vuln.cvssScore) {
            totalCvssScore += vuln.cvssScore;
            cvssCount++;
          }
        });
      }
    });
    
    const averageCvssScore = cvssCount > 0 ? totalCvssScore / cvssCount : 0;

    // Find most vulnerable project
    const projectVulnerabilities = new Map<number, number>();
    completedScans.forEach(scan => {
      const current = projectVulnerabilities.get(scan.projectId) || 0;
      if (scan.totalVulnerabilities > current) {
        projectVulnerabilities.set(scan.projectId, scan.totalVulnerabilities);
      }
    });

    let mostVulnerableProject: { project: Project; vulnerabilities: number } | undefined;
    let maxVulnerabilities = 0;

    for (const [projectId, vulnerabilities] of projectVulnerabilities) {
      if (vulnerabilities > maxVulnerabilities) {
        const project = await this.getProject(projectId);
        if (project) {
          mostVulnerableProject = { project, vulnerabilities };
          maxVulnerabilities = vulnerabilities;
        }
      }
    }

    return {
      totalProjects: projects.length,
      scannedProjects,
      totalScans: scanResults.length,
      averageVulnerabilities,
      averageSecurityScore,
      averageCvssScore,
      mostVulnerableProject
    };
  }

  // Data export/import methods
  async exportData(): Promise<ExportData> {
    const [projects, scanResults, userPreferences] = await Promise.all([
      this.projects.toArray(),
      this.scanResults.toArray(),
      this.userPreferences.toArray()
    ]);

    return {
      version: '1.0.0',
      exportedAt: new Date(),
      projects,
      scanResults,
      userPreferences
    };
  }

  async importData(data: ExportData): Promise<void> {
    await this.transaction('rw', this.projects, this.scanResults, this.userPreferences, async () => {
      // Clear existing data
      await this.projects.clear();
      await this.scanResults.clear();
      await this.userPreferences.clear();

      // Import new data
      await this.projects.bulkAdd(data.projects);
      await this.scanResults.bulkAdd(data.scanResults);
      await this.userPreferences.bulkAdd(data.userPreferences);
    });
  }

  // Cleanup methods
  async cleanupOldScans(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return await this.scanResults.where('startedAt').below(cutoffDate).delete();
  }

  async getStorageUsage(): Promise<{
    projects: number;
    scanResults: number;
    userPreferences: number;
    total: number;
  }> {
    const [projects, scanResults, userPreferences] = await Promise.all([
      this.projects.toArray(),
      this.scanResults.toArray(),
      this.userPreferences.toArray()
    ]);

    const projectsSize = JSON.stringify(projects).length;
    const scanResultsSize = JSON.stringify(scanResults).length;
    const userPreferencesSize = JSON.stringify(userPreferences).length;

    return {
      projects: projectsSize,
      scanResults: scanResultsSize,
      userPreferences: userPreferencesSize,
      total: projectsSize + scanResultsSize + userPreferencesSize
    };
  }
}

// Create and export database instance
export const db = new DevSecOpsDatabase();