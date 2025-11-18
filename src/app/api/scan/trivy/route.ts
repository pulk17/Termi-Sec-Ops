import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { repoCloneService } from '@/lib/repo-clone-service';

const execAsync = promisify(exec);

// Configure route timeout (5 minutes for long-running scans)
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repository, scanPath = '.' } = body;

    if (!repository) {
      return NextResponse.json(
        { error: 'Invalid request: repository required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Trivy scanning repository: ${repository}`);

    // Check if Trivy is installed
    try {
      await execAsync('trivy --version', { timeout: 5000 });
    } catch (error) {
      console.warn('⚠️  Trivy not installed');
      return NextResponse.json(
        { 
          error: 'Trivy is not installed. Install it with: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin',
          installUrl: 'https://aquasecurity.github.io/trivy/latest/getting-started/installation/'
        },
        { status: 500 }
      );
    }

    const vulnerabilities: any[] = [];
    let cloneResult;

    try {
      // Use shared cloning service
      cloneResult = await repoCloneService.cloneRepository(repository);
      const tempDir = cloneResult.tempDir;

      // Run Trivy scan
      const outputFile = path.join(tempDir, 'trivy-results.json');
      console.log(`🔍 Running Trivy filesystem scan...`);
      
      try {
        await execAsync(`trivy fs ${tempDir} --format json --output ${outputFile} --timeout 5m`, {
          timeout: 300000, // 5 minute timeout
          maxBuffer: 100 * 1024 * 1024, // 100MB buffer
          killSignal: 'SIGKILL' // Use SIGKILL to avoid hanging
        });
        console.log(`✅ Trivy scan completed`);
      } catch (execError: any) {
        // Trivy may return non-zero exit code when vulnerabilities are found
        if (fs.existsSync(outputFile)) {
          console.log('✅ Trivy completed with findings');
        } else {
          console.error('❌ Trivy execution error:', execError);
          throw new Error(`Trivy scan failed: ${execError.message}`);
        }
      }

      // Read and parse Trivy results
      if (fs.existsSync(outputFile)) {
        const trivyOutput = fs.readFileSync(outputFile, 'utf-8');
        const trivyResults = JSON.parse(trivyOutput);

        // Parse Trivy JSON format
        if (trivyResults.Results && Array.isArray(trivyResults.Results)) {
          trivyResults.Results.forEach((result: any) => {
            if (result.Vulnerabilities && Array.isArray(result.Vulnerabilities)) {
              result.Vulnerabilities.forEach((vuln: any) => {
                vulnerabilities.push({
                  id: vuln.VulnerabilityID || 'trivy-unknown',
                  title: vuln.Title || vuln.VulnerabilityID || 'Container Vulnerability',
                  description: vuln.Description || 'Trivy detected vulnerability',
                  severity: (vuln.Severity || 'MEDIUM').toLowerCase(),
                  packageName: vuln.PkgName || 'unknown',
                  version: vuln.InstalledVersion || 'unknown',
                  fixedIn: vuln.FixedVersion || undefined,
                  references: vuln.References || [],
                  cvssScore: vuln.CVSS?.nvd?.V3Score || vuln.CVSS?.redhat?.V3Score || undefined,
                  source: 'manual'
                });
              });
            }
          });
        }

        console.log(`✅ Trivy found ${vulnerabilities.length} vulnerabilities`);
      } else {
        console.log('⚠️ Trivy output file not found');
      }

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
    console.error('Trivy scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Trivy scan failed' },
      { status: 500 }
    );
  }
}
