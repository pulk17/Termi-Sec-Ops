'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Github, Settings, Play, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { GitHubClient } from '@/lib/github';
import { parseGitHubUrl } from '@/lib/utils';
import { TerminalScanMonitor } from '@/components/terminal-scan-monitor';

export default function ScanPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [currentScanId, setCurrentScanId] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [scanOptions, setScanOptions] = useState({
    enableOSV: true,
    enableNpmAudit: true,
    enableSnyk: false, // Disable Snyk by default (requires CLI)
    enableTrivy: false, // Disable Trivy by default (requires Docker)
    enableAWSScanning: false,
    enableGitHubActions: false,
    scanDependencies: true,
    scanCode: true,
    scanContainers: false, // Disable container scanning by default
  });

  // Fix hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleScan = async () => {
    if (!repoUrl.trim()) {
      toast.error('Please enter a repository URL');
      return;
    }

    const parsedUrl = parseGitHubUrl(repoUrl);
    if (!parsedUrl) {
      toast.error('Please enter a valid GitHub repository URL');
      return;
    }

    setIsScanning(true);
    
    try {
      // Validate repository access via API route
      const repoResponse = await fetch('/api/github/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: parsedUrl.owner,
          repo: parsedUrl.repo,
          token: githubToken || undefined
        })
      });

      if (!repoResponse.ok) {
        const error = await repoResponse.json();
        throw new Error(error.error || 'Failed to fetch repository');
      }

      const repository = await repoResponse.json();
      
      toast.success(`Repository found: ${repository.full_name}`);
      
      // Start actual scanning process
      const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentScanId(scanId);
      
      // 1. Create project record if it doesn't exist
      const { db } = await import('@/lib/database');
      let project = await db.getProjectByUrl(repoUrl);
      
      if (!project) {
        const projectId = await db.createProject({
          repoUrl,
          name: parsedUrl.repo,
          owner: parsedUrl.owner,
          language: repository.language || 'Unknown',
          isPrivate: repository.private,
          lastScanned: new Date()
        });
        project = await db.getProject(projectId);
      } else {
        if (project.id) {
          await db.updateProject(project.id, { lastScanned: new Date() });
        }
      }

      // 2. Create scan record
      await db.createScanResult({
        projectId: project!.id!,
        scanId,
        status: 'running',
        startedAt: new Date(),
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        scanOptions,
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

      // 3. Start actual scanning process
      toast.info('Scan started! This may take a few minutes...');
      
      // Start real security scanning
      const { startSecurityScan } = await import('@/lib/security-scanner');
      
      try {
        if (!project?.id) {
          throw new Error('Project not found or invalid');
        }
        
        await startSecurityScan({
          scanId,
          projectId: project.id,
          repoUrl,
          owner: parsedUrl.owner,
          repo: parsedUrl.repo,
          githubToken,
          scanOptions
        });
        
        setIsScanning(false);
        toast.success('Scan completed successfully!');
        router.push(`/scan/results/${scanId}`);
      } catch (scanError) {
        console.error('Security scan failed:', scanError);
        await db.updateScanResultByScanId(scanId, {
          status: 'failed',
          error: scanError instanceof Error ? scanError.message : 'Unknown scan error',
          completedAt: new Date()
        });
        setIsScanning(false);
        toast.error('Scan failed. Please try again.');
      }
      
    } catch (error) {
      console.error('Scan failed:', error);
      toast.error(error instanceof Error ? error.message : 'Scan failed');
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-black terminal-scanline">
      {/* Navigation */}
      <nav className="border-b border-green-700 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-green-400 terminal-glow" />
            <span className="text-xl font-bold font-mono text-green-400 terminal-glow">DevSecOps Pipeline</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.push('/')} className="font-mono text-green-400 hover:text-green-300 hover:bg-green-900/20">
              Home
            </Button>
            <Button variant="ghost" onClick={() => router.push('/dashboard')} className="font-mono text-green-400 hover:text-green-300 hover:bg-green-900/20">
              Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold font-mono text-green-400 terminal-glow mb-4">
              &gt; Security Scan
            </h1>
            <p className="text-xl font-mono text-green-300">
              Analyze your GitHub repository for vulnerabilities and security issues
            </p>
          </div>

          {/* Terminal Monitor - Show during scanning */}
          {isScanning && (
            <div className="mb-8">
              <TerminalScanMonitor scanId={currentScanId} isScanning={isScanning} />
            </div>
          )}

          {/* Main Scan Form */}
          <Card className="mb-8 bg-black border-green-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 font-mono text-green-400">
                <Github className="h-5 w-5" />
                <span>$ Repository Information</span>
              </CardTitle>
              <CardDescription className="font-mono text-green-300">
                Enter your GitHub repository URL and authentication details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Repository URL */}
              <div className="space-y-2">
                <Label htmlFor="repo-url" className="font-mono text-green-400">Repository URL</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/owner/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="text-base font-mono bg-black border-green-700 text-green-400 placeholder:text-green-700"
                />
                <p className="text-sm font-mono text-green-300">
                  Enter the full GitHub repository URL (e.g., https://github.com/facebook/react)
                </p>
              </div>

              {/* GitHub Token */}
              <div className="space-y-2">
                <Label htmlFor="github-token" className="font-mono text-green-400">GitHub Personal Access Token (Optional)</Label>
                <Input
                  id="github-token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="text-base font-mono bg-black border-green-700 text-green-400 placeholder:text-green-700"
                />
                <p className="text-sm font-mono text-green-300">
                  Required for private repositories. Create one at{' '}
                  <a 
                    href="https://github.com/settings/tokens" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-400 hover:underline"
                  >
                    GitHub Settings
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scan Options */}
          <Card className="mb-8 bg-black border-green-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 font-mono text-green-400">
                <Settings className="h-5 w-5" />
                <span>$ Scan Options</span>
              </CardTitle>
              <CardDescription className="font-mono text-green-300">
                Configure which security scans to perform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Vulnerability Scanners */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Vulnerability Scanners</h3>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-osv"
                      checked={scanOptions.enableOSV}
                      onCheckedChange={(checked) => 
                        setScanOptions(prev => ({ ...prev, enableOSV: checked as boolean }))
                      }
                    />
                    <Label htmlFor="enable-osv" className="flex items-center space-x-2">
                      <span>OSV (Open Source Vulnerabilities)</span>
                      <Badge variant="secondary">Recommended</Badge>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-npm-audit"
                      checked={scanOptions.enableNpmAudit}
                      onCheckedChange={(checked) => 
                        setScanOptions(prev => ({ ...prev, enableNpmAudit: checked as boolean }))
                      }
                    />
                    <Label htmlFor="enable-npm-audit">npm audit (Node.js projects)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-snyk"
                      checked={scanOptions.enableSnyk}
                      onCheckedChange={(checked) => 
                        setScanOptions(prev => ({ ...prev, enableSnyk: checked as boolean }))
                      }
                    />
                    <Label htmlFor="enable-snyk" className="flex items-center space-x-2">
                      <span>Snyk Vulnerability Scanner</span>
                      <Badge variant="outline">API Key Required</Badge>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-trivy"
                      checked={scanOptions.enableTrivy}
                      onCheckedChange={(checked) => 
                        setScanOptions(prev => ({ ...prev, enableTrivy: checked as boolean }))
                      }
                    />
                    <Label htmlFor="enable-trivy" className="flex items-center space-x-2">
                      <span>Trivy Container Security</span>
                      <Badge variant="secondary">Recommended</Badge>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-github-actions"
                      checked={scanOptions.enableGitHubActions}
                      onCheckedChange={(checked) => 
                        setScanOptions(prev => ({ ...prev, enableGitHubActions: checked as boolean }))
                      }
                    />
                    <Label htmlFor="enable-github-actions">GitHub Actions Security</Label>
                  </div>
                </div>

                {/* Scan Types */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Scan Types</h3>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="scan-dependencies"
                      checked={scanOptions.scanDependencies}
                      onCheckedChange={(checked) => 
                        setScanOptions(prev => ({ ...prev, scanDependencies: checked as boolean }))
                      }
                    />
                    <Label htmlFor="scan-dependencies">Dependency Vulnerabilities</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="scan-code"
                      checked={scanOptions.scanCode}
                      onCheckedChange={(checked) => 
                        setScanOptions(prev => ({ ...prev, scanCode: checked as boolean }))
                      }
                    />
                    <Label htmlFor="scan-code">Code Quality & Security</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="scan-containers"
                      checked={scanOptions.scanContainers}
                      onCheckedChange={(checked) => 
                        setScanOptions(prev => ({ ...prev, scanContainers: checked as boolean }))
                      }
                    />
                    <Label htmlFor="scan-containers" className="flex items-center space-x-2">
                      <span>Container Security Scanning</span>
                      <Badge variant="outline">Docker Required</Badge>
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scan Button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={handleScan}
              disabled={isScanning}
              className="text-lg px-12 py-6 font-mono bg-green-700 hover:bg-green-600 text-black"
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2" />
                  $ scanning_repository...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  $ start_security_scan
                </>
              )}
            </Button>
          </div>

          {/* Scan Workflow */}
          <Card className="mt-12 bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-gray-100">Scan Workflow</CardTitle>
              <CardDescription className="text-gray-400">
                The following steps will be executed during the security scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex items-center space-x-3 text-gray-300">
                  <span className="text-green-400">1.</span>
                  <span>Fetch repository from GitHub</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <span className="text-green-400">2.</span>
                  <span>Analyze project structure & identify languages</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <span className="text-green-400">3.</span>
                  <span>Scan dependencies for vulnerabilities</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <span className="text-green-400">4.</span>
                  <span>Run npm audit (Node.js projects)</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <span className="text-green-400">5.</span>
                  <span>Query OSV.dev vulnerability database</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <span className="text-green-400">6.</span>
                  <span>Analyze GitHub Actions workflows</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <span className="text-green-400">7.</span>
                  <span>Run Snyk vulnerability scanner (if enabled)</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <span className="text-green-400">8.</span>
                  <span>Run Trivy container security scan</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <span className="text-green-400">9.</span>
                  <span>Generate vulnerability report with AI suggestions</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <span className="text-green-400">10.</span>
                  <span>Provide Docker build command & deployment options</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What We Scan</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Dependency vulnerabilities (npm audit & OSV)</li>
                  <li>• Container security (Trivy)</li>
                  <li>• Code security patterns</li>
                  <li>• Missing security policies</li>
                  <li>• Potential secret exposure</li>
                  <li>• Outdated dependencies</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Privacy & Security</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• BFF pattern (Backend-for-Frontend)</li>
                  <li>• No code stored on servers</li>
                  <li>• Encrypted token storage</li>
                  <li>• GDPR compliant</li>
                  <li>• Open source</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Supported Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• JavaScript/TypeScript</li>
                  <li>• Python</li>
                  <li>• Java</li>
                  <li>• Go</li>
                  <li>• Rust, PHP, Ruby</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}