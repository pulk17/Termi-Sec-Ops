import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DevSecOpsDatabase } from '@/lib/database';
import 'fake-indexeddb/auto';

describe('Database Migration', () => {
  let db: DevSecOpsDatabase;

  beforeEach(async () => {
    db = new DevSecOpsDatabase();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('should handle updatedAt field properly', async () => {
    // Create a project
    const projectId = await db.createProject({
      repoUrl: 'https://github.com/test/repo',
      name: 'test-repo',
      owner: 'test',
      isPrivate: false
    });

    // Create a scan result
    const scanId = 'test-scan-123';
    const scanResultId = await db.createScanResult({
      projectId,
      scanId,
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
      totalVulnerabilities: 5,
      criticalCount: 1,
      highCount: 2,
      mediumCount: 1,
      lowCount: 1,
      scanOptions: {
        enableOSV: false,
        enableNpmAudit: false,
        enableSnyk: false,
        enableAWSScanning: false,
        enableGitHubActions: false,
        scanDependencies: true,
        scanCode: false,
        scanContainers: false
      },
      results: {
        summary: {
          totalVulnerabilities: 5,
          criticalCount: 1,
          highCount: 2,
          mediumCount: 1,
          lowCount: 1,
          fixableCount: 3,
          securityScore: 75,
          riskLevel: 'medium'
        }
      }
    });

    // Verify the scan result was created with updatedAt
    const scanResult = await db.getScanResult(scanResultId);
    expect(scanResult).toBeDefined();
    expect(scanResult?.updatedAt).toBeDefined();
    expect(scanResult?.updatedAt).toBeInstanceOf(Date);

    // Test updating scan progress
    await db.updateScanProgress(scanId, {
      stage: 'scanning',
      percentage: 50,
      message: 'Scanning dependencies...',
      currentTask: 'npm packages'
    });

    const updatedScan = await db.getScanResultByScanId(scanId);
    expect(updatedScan?.progress).toBeDefined();
    expect(updatedScan?.progress?.stage).toBe('scanning');
    expect(updatedScan?.progress?.percentage).toBe(50);
  });

  it('should cleanup stale scans', async () => {
    const projectId = await db.createProject({
      repoUrl: 'https://github.com/test/stale',
      name: 'stale-repo',
      owner: 'test',
      isPrivate: false
    });

    // Create an old running scan
    const oldDate = new Date();
    oldDate.setHours(oldDate.getHours() - 2); // 2 hours ago

    await db.createScanResult({
      projectId,
      scanId: 'stale-scan-123',
      status: 'running',
      startedAt: oldDate,
      totalVulnerabilities: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      scanOptions: {
        enableSnyk: true,
        enableOSV: false,
        enableNpmAudit: false,
        enableGitHubActions: false,
        enableAWSScanning: false,
        scanDependencies: true,
        scanCode: false,
        scanContainers: false
      },
      results: {
        summary: {
          totalVulnerabilities: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          fixableCount: 0,
          securityScore: 100,
          riskLevel: 'low'
        }
      }
    });

    // Manually set updatedAt to old date to simulate stale scan
    const staleScan = await db.getScanResultByScanId('stale-scan-123');
    if (staleScan?.id) {
      await db.scanResults.update(staleScan.id, { updatedAt: oldDate });
    }

    // Cleanup stale scans (older than 1 hour)
    const cleanedUp = await db.cleanupStaleScans(60);
    expect(cleanedUp).toBe(1);

    // Verify the scan was marked as failed
    const updatedScan = await db.getScanResultByScanId('stale-scan-123');
    expect(updatedScan?.status).toBe('failed');
    expect(updatedScan?.error).toContain('timed out');
  });

  it('should get active scans', async () => {
    const projectId = await db.createProject({
      repoUrl: 'https://github.com/test/active',
      name: 'active-repo',
      owner: 'test',
      isPrivate: false
    });

    // Create a running scan
    await db.createScanResult({
      projectId,
      scanId: 'active-scan-123',
      status: 'running',
      startedAt: new Date(),
      totalVulnerabilities: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      scanOptions: {
        enableSnyk: true,
        enableOSV: false,
        enableNpmAudit: false,
        enableGitHubActions: false,
        enableAWSScanning: false,
        scanDependencies: true,
        scanCode: false,
        scanContainers: false
      },
      results: {
        summary: {
          totalVulnerabilities: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          fixableCount: 0,
          securityScore: 100,
          riskLevel: 'low'
        }
      }
    });

    const activeScans = await db.getActiveScanResults();
    expect(activeScans).toHaveLength(1);
    expect(activeScans[0].scanId).toBe('active-scan-123');
    expect(activeScans[0].status).toBe('running');
  });
});