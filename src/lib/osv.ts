// Removed unused toast import

export interface OSVVulnerability {
  id: string;
  summary: string;
  details?: string;
  aliases?: string[];
  modified: string;
  published?: string;
  withdrawn?: string;
  database_specific?: Record<string, any>;
  ecosystem_specific?: Record<string, any>;
  affected: OSVAffected[];
  references?: OSVReference[];
  severity?: OSVSeverity[];
  credits?: OSVCredit[];
  schema_version?: string;
}

export interface OSVAffected {
  package: {
    name: string;
    ecosystem: string;
    purl?: string;
  };
  ranges?: OSVRange[];
  versions?: string[];
  ecosystem_specific?: Record<string, any>;
  database_specific?: Record<string, any>;
}

export interface OSVRange {
  type: 'ECOSYSTEM' | 'SEMVER' | 'GIT';
  repo?: string;
  events: OSVEvent[];
  database_specific?: Record<string, any>;
}

export interface OSVEvent {
  introduced?: string;
  fixed?: string;
  last_affected?: string;
  limit?: string;
}

export interface OSVReference {
  type: 'ADVISORY' | 'ARTICLE' | 'DETECTION' | 'DISCUSSION' | 'REPORT' | 'FIX' | 'INTRODUCED' | 'PACKAGE' | 'EVIDENCE' | 'WEB';
  url: string;
}

export interface OSVSeverity {
  type: 'CVSS_V2' | 'CVSS_V3';
  score: string;
}

export interface OSVCredit {
  name: string;
  contact?: string[];
  type?: 'FINDER' | 'REPORTER' | 'ANALYST' | 'COORDINATOR' | 'REMEDIATION_DEVELOPER' | 'REMEDIATION_REVIEWER' | 'REMEDIATION_VERIFIER' | 'TOOL' | 'SPONSOR' | 'OTHER';
}

export interface OSVQueryRequest {
  package?: {
    name: string;
    ecosystem: string;
  };
  version?: string;
  commit?: string;
}

export interface OSVBatchQueryRequest {
  queries: OSVQueryRequest[];
}

export interface OSVQueryResponse {
  vulns: OSVVulnerability[];
}

export interface OSVBatchQueryResponse {
  results: OSVQueryResponse[];
}

export class OSVClient {
  private baseUrl: string = 'https://api.osv.dev';
  private rateLimitDelay: number = 100; // ms between requests

  constructor() {
    // OSV API doesn't require authentication
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Simple rate limiting
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DevSecOps-Pipeline/1.0.0',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OSV API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Use default error message
      }

      if (response.status === 429) {
        throw new Error('OSV API rate limit exceeded. Please try again later.');
      }

      throw new Error(errorMessage);
    }

    return await response.json() as T;
  }

  // Query single package
  async queryPackage(
    packageName: string,
    ecosystem: string,
    version?: string
  ): Promise<OSVVulnerability[]> {
    const query: OSVQueryRequest = {
      package: {
        name: packageName,
        ecosystem: ecosystem.toUpperCase()
      }
    };

    if (version) {
      query.version = version;
    }

    try {
      const response = await this.makeRequest<OSVQueryResponse>('/v1/query', {
        method: 'POST',
        body: JSON.stringify(query)
      });

      return response.vulns || [];
    } catch (error) {
      console.error(`Failed to query OSV for ${packageName}:`, error);
      throw error;
    }
  }

  // Batch query multiple packages
  async queryPackages(queries: OSVQueryRequest[]): Promise<OSVQueryResponse[]> {
    if (queries.length === 0) return [];

    // OSV API has a limit on batch size, so we chunk the requests
    const chunkSize = 1000;
    const results: OSVQueryResponse[] = [];

    for (let i = 0; i < queries.length; i += chunkSize) {
      const chunk = queries.slice(i, i + chunkSize);
      
      try {
        const batchRequest: OSVBatchQueryRequest = { queries: chunk };
        const response = await this.makeRequest<OSVBatchQueryResponse>('/v1/querybatch', {
          method: 'POST',
          body: JSON.stringify(batchRequest)
        });

        results.push(...response.results);
      } catch (error) {
        console.error(`Failed to batch query OSV (chunk ${i / chunkSize + 1}):`, error);
        // Continue with other chunks
      }
    }

    return results;
  }

  // Get vulnerability by ID
  async getVulnerability(vulnId: string): Promise<OSVVulnerability> {
    try {
      return await this.makeRequest<OSVVulnerability>(`/v1/vulns/${encodeURIComponent(vulnId)}`);
    } catch (error) {
      console.error(`Failed to get OSV vulnerability ${vulnId}:`, error);
      throw error;
    }
  }

  // Utility methods
  static mapEcosystemName(ecosystem: string): string {
    const mapping: Record<string, string> = {
      'npm': 'npm',
      'pypi': 'PyPI',
      'maven': 'Maven',
      'go': 'Go',
      'crates.io': 'crates.io',
      'packagist': 'Packagist',
      'rubygems': 'RubyGems',
      'nuget': 'NuGet',
      'hex': 'Hex',
      'pub': 'Pub'
    };

    return mapping[ecosystem.toLowerCase()] || ecosystem;
  }

  static extractSeverityScore(vulnerability: OSVVulnerability): number | null {
    if (!vulnerability.severity || vulnerability.severity.length === 0) {
      return null;
    }

    // Prefer CVSS v3 over v2
    const cvssV3 = vulnerability.severity.find(s => s.type === 'CVSS_V3');
    const cvssV2 = vulnerability.severity.find(s => s.type === 'CVSS_V2');
    
    const severity = cvssV3 || cvssV2;
    if (!severity) return null;

    // Extract numeric score from CVSS string
    const scoreMatch = severity.score.match(/(\d+\.?\d*)/);
    return scoreMatch ? parseFloat(scoreMatch[1]) : null;
  }

  static categorizeSeverity(score: number | null): 'critical' | 'high' | 'medium' | 'low' {
    if (score === null) return 'medium'; // Default for unknown severity
    
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }

  static isVersionAffected(version: string, affected: OSVAffected): boolean {
    if (!affected.ranges || affected.ranges.length === 0) {
      // If no ranges specified, check versions array
      return affected.versions ? affected.versions.includes(version) : false;
    }

    // Check each range
    for (const range of affected.ranges) {
      if (this.isVersionInRange(version, range)) {
        return true;
      }
    }

    return false;
  }

  private static isVersionInRange(version: string, range: OSVRange): boolean {
    // This is a simplified version comparison
    // In a production environment, you'd want to use proper semver comparison
    for (const event of range.events) {
      if (event.introduced && this.compareVersions(version, event.introduced) >= 0) {
        if (event.fixed && this.compareVersions(version, event.fixed) < 0) {
          return true;
        } else if (!event.fixed) {
          return true;
        }
      }
    }

    return false;
  }

  private static compareVersions(a: string, b: string): number {
    // Simplified version comparison - in production use a proper semver library
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    const maxLength = Math.max(aParts.length, bParts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    
    return 0;
  }

  static formatVulnerability(vulnerability: OSVVulnerability): string {
    const score = this.extractSeverityScore(vulnerability);
    const severity = this.categorizeSeverity(score);
    const scoreText = score ? ` (Score: ${score})` : '';
    
    return `[${severity.toUpperCase()}] ${vulnerability.id}: ${vulnerability.summary}${scoreText}`;
  }
}

// Create default client instance
export const osvClient = new OSVClient();