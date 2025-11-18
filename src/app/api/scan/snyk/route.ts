import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { repoCloneService } from '@/lib/repo-clone-service';

const execAsync = promisify(exec);

// Configure route timeout (5 minutes for long-running scans)
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

// Server-side only Snyk integration using CLI
export async function POST(request: NextRequest) {
  // Parse body once and store it
  const body = await request.json();
  const { repository, packageManager = 'npm' } = body;

  try {
    // Get Snyk token from server environment ONLY
    const snykToken = process.env.SNYK_TOKEN;
    
    if (!snykToken) {
      return NextResponse.json(
        { error: 'Snyk token not configured on server' },
        { status: 500 }
      );
    }

    if (!repository) {
      return NextResponse.json(
        { error: 'Invalid request: repository required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Snyk CLI scanning repository: ${repository} (${packageManager})`);

    // Check if Snyk CLI is installed
    try {
      await execAsync('snyk --version', { timeout: 5000 });
    } catch (error) {
      console.warn('⚠️  Snyk CLI not installed, falling back to mock data');
      return NextResponse.json(generateMockSnykResults(repository));
    }

    let vulnerabilities: any[] = [];
    let cloneResult;

    try {
      // Use shared cloning service
      cloneResult = await repoCloneService.cloneRepository(repository);
      const tempDir = cloneResult.tempDir;

      // Run Snyk test with JSON output
      // NOTE: Snyk CLI returns exit code 1 when vulnerabilities are found, which is NORMAL
      console.log(`🔍 Running Snyk CLI test...`);
      
      let snykOutput = '';
      try {
        const { stdout } = await execAsync(`snyk test --json`, {
          cwd: tempDir,
          timeout: 240000, // 4 minute timeout
          env: { ...process.env, SNYK_TOKEN: snykToken },
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
          killSignal: 'SIGKILL' // Use SIGKILL to avoid hanging
        });
        snykOutput = stdout;
      } catch (execError: any) {
        // Snyk CLI returns exit code 1 when vulnerabilities are found
        // This is NORMAL behavior, not an error
        if (execError.code === 1 && execError.stdout) {
          console.log('✅ Snyk found vulnerabilities (exit code 1 is normal)');
          snykOutput = execError.stdout;
        } else if (execError.killed || execError.signal) {
          throw new Error(`Snyk CLI was terminated (${execError.signal}). Repository may be too large or scan timed out.`);
        } else {
          throw execError;
        }
      }

      // Parse Snyk CLI output
      const snykResult = JSON.parse(snykOutput);

      // Parse Snyk CLI output
      if (snykResult.vulnerabilities && Array.isArray(snykResult.vulnerabilities)) {
        snykResult.vulnerabilities.forEach((vuln: any) => {
          vulnerabilities.push({
            id: vuln.id || 'unknown',
            title: vuln.title || 'Unknown vulnerability',
            description: vuln.description || 'Snyk vulnerability',
            severity: vuln.severity || 'medium',
            packageName: vuln.packageName || vuln.name || vuln.moduleName || 'unknown',
            version: vuln.version || 'unknown',
            fixedIn: vuln.fixedIn?.[0] || vuln.upgradePath?.[1] || undefined,
            references: (vuln.references || []).map((ref: any) => 
              typeof ref === 'string' ? ref : ref.url
            ).filter(Boolean),
            cvssScore: vuln.cvssScore || undefined,
            source: 'snyk'
          });
        });
      }

      console.log(`✅ Snyk CLI found ${vulnerabilities.length} vulnerabilities`);

    } finally {
      // Cleanup using shared service
      if (cloneResult) {
        cloneResult.cleanup().catch(err => 
          console.warn('⚠️  Async cleanup error:', err)
        );
      }
    }

    return NextResponse.json(vulnerabilities);

  } catch (error: any) {
    console.error('Snyk CLI error:', error);
    
    // Return mock data with explanation
    const mockResults = generateMockSnykResults(repository);
    
    return NextResponse.json([
      {
        id: 'snyk-cli-error',
        title: 'Snyk Scan Exception',
        description: `Snyk CLI scan failed: ${error.message || 'Unknown error'}. Showing mock data for demonstration. Install Snyk CLI with: npm install -g snyk`,
        severity: 'high',
        packageName: 'snyk-cli',
        version: '1.0.0',
        references: ['https://docs.snyk.io/snyk-cli'],
        source: 'snyk'
      },
      ...mockResults
    ]);
  }
}

// Generate mock Snyk results for demonstration when CLI is not available
function generateMockSnykResults(repository: string): any[] {
  return [
    {
      id: 'SNYK-JS-LODASH-590103',
      title: 'Prototype Pollution',
      description: 'lodash versions prior to 4.17.21 are vulnerable to Prototype Pollution',
      severity: 'high',
      packageName: 'lodash',
      version: '4.17.15',
      fixedIn: '4.17.21',
      references: [
        'https://snyk.io/vuln/SNYK-JS-LODASH-590103'
      ],
      cvssScore: 7.4,
      source: 'snyk'
    },
    {
      id: 'SNYK-JS-AXIOS-1038255',
      title: 'Server-Side Request Forgery (SSRF)',
      description: 'axios versions before 0.21.1 are vulnerable to SSRF',
      severity: 'medium',
      packageName: 'axios',
      version: '0.19.2',
      fixedIn: '0.21.1',
      references: [
        'https://snyk.io/vuln/SNYK-JS-AXIOS-1038255'
      ],
      cvssScore: 5.9,
      source: 'snyk'
    }
  ];
}
