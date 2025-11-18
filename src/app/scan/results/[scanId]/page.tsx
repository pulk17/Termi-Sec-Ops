"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, type ScanResult, type Project } from "@/lib/database";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { DeploymentManager } from "@/components/deployment-manager";

export default function ScanResultsPage() {
  const params = useParams();
  const scanId = params.scanId as string;

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{
    stage: string;
    percentage: number;
    message: string;
    currentTask?: string;
  } | null>(null);
  const [expandedVulns, setExpandedVulns] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Map<string, string>>(new Map());
  const [loadingAiSuggestion, setLoadingAiSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const loadScanResult = async () => {
      try {
        setLoading(true);
        const result = await db.getScanResultByScanId(scanId);

        if (!result) {
          setError("Scan result not found");
          return;
        }

        setScanResult(result);
        setScanProgress(result.progress || null);

        // Load project details
        const projectData = await db.getProject(result.projectId);
        setProject(projectData || null);

        // If scan is still running, poll for updates using Zustand
        if ((result.status === 'running' || result.status === 'queued') && typeof window !== 'undefined') {
          const pollInterval = setInterval(async () => {
            const updatedResult = await db.getScanResultByScanId(scanId);
            if (updatedResult) {
              setScanResult(updatedResult);
              setScanProgress(updatedResult.progress || null);
              
              // Stop polling when scan completes
              if (updatedResult.status !== 'running' && updatedResult.status !== 'queued') {
                clearInterval(pollInterval);
              }
            }
          }, 2000); // Poll every 2 seconds

          return () => clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Failed to load scan result:", err);
        setError("Failed to load scan result");
      } finally {
        setLoading(false);
      }
    };

    if (scanId) {
      loadScanResult();
    }
  }, [scanId]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "low":
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "default";
    }
  };

  const toggleVulnExpansion = (index: number) => {
    setExpandedVulns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getAiFixSuggestion = async (vuln: any, uniqueKey: string) => {
    if (aiSuggestions.has(uniqueKey)) {
      return; // Already have suggestion
    }

    setLoadingAiSuggestion(uniqueKey);
    try {
      const response = await fetch('/api/ai/suggest-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vulnerability: vuln }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get AI suggestion');
      }

      const data = await response.json();
      setAiSuggestions(prev => new Map(prev).set(uniqueKey, data.suggestion));
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setAiSuggestions(prev => new Map(prev).set(uniqueKey, 
        `Failed to generate AI suggestion: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure GEMINI_API_KEY is configured in your environment.`
      ));
    } finally {
      setLoadingAiSuggestion(null);
    }
  };

  const handleExportReport = async (format: 'json' | 'csv' | 'html' = 'json') => {
    if (!scanResult) return;
    
    setIsExporting(true);
    try {
      const projectName = project ? `${project.owner}/${project.name}` : "Unknown Project";
      const dateStr = new Date().toISOString().split('T')[0];
      const scanIdShort = scanId.slice(-8);
      
      if (format === 'json') {
        // Create a comprehensive JSON report
        const report = {
          scanId: scanId,
          project: projectName,
          status: scanResult.status,
          startedAt: scanResult.startedAt.toISOString(),
          completedAt: scanResult.completedAt?.toISOString(),
          duration: scanResult.completedAt 
            ? Math.round((scanResult.completedAt.getTime() - scanResult.startedAt.getTime()) / 1000)
            : null,
          summary: {
            totalVulnerabilities: scanResult.totalVulnerabilities,
            criticalCount: scanResult.criticalCount,
            highCount: scanResult.highCount,
            mediumCount: scanResult.mediumCount,
            lowCount: scanResult.lowCount,
          },
          vulnerabilities: vulnerabilities,
          scanOptions: scanResult.scanOptions,
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scan-report-${scanIdShort}-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Create CSV report
        const headers = ['Package', 'Version', 'Severity', 'Vulnerability ID', 'Title', 'Description', 'Fix Available', 'CVSS Score'];
        const rows = vulnerabilities.map(v => [
          v.packageName || v.name || 'Unknown',
          v.version || v.range || 'Unknown',
          v.severity || 'Unknown',
          v.id || 'N/A',
          (v.title || v.name || 'Unknown').replace(/"/g, '""'),
          (v.description || 'No description').replace(/"/g, '""'),
          v.fixedIn || (v.fixAvailable ? 'Yes' : 'No'),
          v.cvssScore || 'N/A'
        ]);
        
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scan-report-${scanIdShort}-${dateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'html') {
        // Create HTML report
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Scan Report - ${projectName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .critical { color: #dc2626; }
        .high { color: #ea580c; }
        .medium { color: #d97706; }
        .low { color: #65a30d; }
        .vulnerability { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        .vuln-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Scan Report</h1>
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Scan ID:</strong> ${scanId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Status:</strong> ${scanResult.status}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="metric-value">${scanResult.totalVulnerabilities}</div>
            <div>Total Vulnerabilities</div>
        </div>
        <div class="metric">
            <div class="metric-value critical">${scanResult.criticalCount}</div>
            <div>Critical</div>
        </div>
        <div class="metric">
            <div class="metric-value high">${scanResult.highCount}</div>
            <div>High</div>
        </div>
        <div class="metric">
            <div class="metric-value medium">${scanResult.mediumCount}</div>
            <div>Medium</div>
        </div>
        <div class="metric">
            <div class="metric-value low">${scanResult.lowCount}</div>
            <div>Low</div>
        </div>
    </div>
    
    <h2>Vulnerabilities</h2>
    ${vulnerabilities.map(v => `
        <div class="vulnerability">
            <div class="vuln-header">
                <h3>${v.title || v.name || 'Unknown Vulnerability'}</h3>
                <span class="badge ${v.severity}">${(v.severity || 'unknown').toUpperCase()}</span>
            </div>
            <p><strong>Package:</strong> ${v.packageName || v.name || 'Unknown'} @ ${v.version || v.range || 'Unknown'}</p>
            ${v.id ? `<p><strong>ID:</strong> ${v.id}</p>` : ''}
            ${v.description ? `<p><strong>Description:</strong> ${v.description}</p>` : ''}
            ${v.cvssScore ? `<p><strong>CVSS Score:</strong> ${v.cvssScore}</p>` : ''}
            ${v.fixedIn ? `<p><strong>Fix:</strong> Upgrade to ${v.fixedIn}</p>` : ''}
            ${v.references && v.references.length > 0 ? `
                <p><strong>References:</strong></p>
                <ul>
                    ${v.references.slice(0, 5).map((ref: string) => `<li><a href="${ref}" target="_blank">${ref}</a></li>`).join('')}
                </ul>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>`;
        
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scan-report-${scanIdShort}-${dateStr}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading scan results...</p>
        </div>
      </div>
    );
  }

  if (error || !scanResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Scan Not Found</h1>
          <p className="text-muted-foreground mb-4">
            {error || "The requested scan result could not be found."}
          </p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Extract vulnerabilities from scan results and deduplicate
  const vulnerabilitiesMap = new Map<string, any>();
  
  // Add Snyk vulnerabilities
  if (scanResult.results?.snyk && Array.isArray(scanResult.results.snyk)) {
    scanResult.results.snyk.forEach((v: any) => {
      // Filter out invalid/unknown vulnerabilities
      if (!v.id || v.id === 'unknown' || !v.packageName || v.packageName === 'unknown' || 
          v.version === '0' || v.version === 'unknown' || v.title === 'Unknown vulnerability') {
        return;
      }
      // Filter out error/info messages that aren't real vulnerabilities
      if (v.id.includes('error') || v.id.includes('not-found') || v.id.includes('clean')) {
        return;
      }
      const key = `snyk-${v.id}-${v.packageName}`;
      if (!vulnerabilitiesMap.has(key)) {
        vulnerabilitiesMap.set(key, { ...v, source: 'snyk' });
      }
    });
  }
  
  // Add Trivy vulnerabilities
  if (scanResult.results?.trivy && Array.isArray(scanResult.results.trivy)) {
    scanResult.results.trivy.forEach((v: any) => {
      // Filter out invalid/unknown vulnerabilities
      if (!v.id || v.id === 'unknown' || !v.packageName || v.packageName === 'unknown' || 
          v.version === '0' || v.version === 'unknown' || v.title === 'Unknown vulnerability') {
        return;
      }
      // Filter out error/info messages that aren't real vulnerabilities
      if (v.id.includes('error') || v.id.includes('not-found') || v.id.includes('clean')) {
        return;
      }
      const key = `trivy-${v.id}-${v.packageName}`;
      if (!vulnerabilitiesMap.has(key)) {
        vulnerabilitiesMap.set(key, { ...v, source: 'trivy' });
      }
    });
  }
  
  // Add OSV vulnerabilities
  if (scanResult.results?.osv && Array.isArray(scanResult.results.osv)) {
    scanResult.results.osv.forEach((v: any) => {
      // Get package info from affected array
      const affected = v.affected?.[0];
      const packageName = affected?.package?.name || v.package?.name || 'Unknown Package';
      
      // Try to get version from multiple possible locations
      let version = 'Unknown';
      if (affected?.ranges?.[0]?.events?.[0]?.introduced) {
        version = affected.ranges[0].events[0].introduced;
      } else if (affected?.versions?.[0]) {
        version = affected.versions[0];
      } else if (v.affected_versions) {
        version = v.affected_versions;
      }
      
      // Only filter out if we have no ID at all
      if (!v.id) {
        return;
      }
      
      const key = `osv-${v.id}-${packageName}`;
      if (!vulnerabilitiesMap.has(key)) {
        vulnerabilitiesMap.set(key, {
          id: v.id,
          title: v.summary || v.details || 'OSV Vulnerability',
          description: v.details || v.summary || 'No description available',
          severity: v.severity?.toLowerCase() || v.database_specific?.severity?.toLowerCase() || 'medium',
          packageName,
          version,
          references: v.references?.map((r: any) => r.url) || [],
          cvssScore: v.database_specific?.cvss_score,
          source: 'osv'
        });
      }
    });
  }
  
  // Add npm audit vulnerabilities
  if (scanResult.results?.npmAudit && Array.isArray(scanResult.results.npmAudit)) {
    scanResult.results.npmAudit.forEach((v: any) => {
      // Only filter out if we have no name at all
      if (!v.name) {
        return;
      }
      
      const key = `npm-${v.name}-${v.range || 'any'}`;
      if (!vulnerabilitiesMap.has(key)) {
        // Extract description from via array
        let description = 'npm audit vulnerability';
        if (Array.isArray(v.via)) {
          const viaDescriptions = v.via
            .filter((item: any) => typeof item === 'object' && item.title)
            .map((item: any) => item.title);
          if (viaDescriptions.length > 0) {
            description = viaDescriptions.join('; ');
          }
        } else if (typeof v.via === 'string') {
          description = v.via;
        }
        
        vulnerabilitiesMap.set(key, {
          id: `npm-${v.name}`,
          title: `${v.name} vulnerability`,
          description,
          severity: v.severity || 'medium',
          packageName: v.name,
          version: v.range || 'Any version',
          fixAvailable: v.fixAvailable,
          via: v.via,
          effects: v.effects,
          nodes: v.nodes,
          source: 'npm-audit'
        });
      }
    });
  }
  
  // Convert map to array
  const vulnerabilities = Array.from(vulnerabilitiesMap.values());

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">DevSecOps Pipeline</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/scan">
              <Button>New Scan</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold glitch-hover relative" data-text="Scan Results">
                Scan Results
              </h1>
              <Badge
                className={
                  scanResult.status === "completed"
                    ? "bg-green-100 text-green-800 hover:scale-110 transition-transform"
                    : scanResult.status === "failed"
                      ? "bg-red-100 text-red-800 hover:scale-110 transition-transform glitch-effect"
                      : scanResult.status === "running"
                        ? "bg-blue-100 text-blue-800 hover:scale-110 transition-transform animate-pulse"
                        : "bg-gray-100 text-gray-800 hover:scale-110 transition-transform"
                }
              >
                {scanResult.status}
              </Badge>
            </div>
            <p className="text-xl text-muted-foreground">
              {project ? `${project.owner}/${project.name}` : "Unknown Project"}{" "}
              • Scan ID: {scanId.slice(-8)}
            </p>
            <p className="text-sm text-muted-foreground">
              Started {formatRelativeTime(scanResult.startedAt)}
              {scanResult.completedAt && (
                <> • Duration: {Math.round((scanResult.completedAt.getTime() - scanResult.startedAt.getTime()) / 1000)}s</>
              )}
            </p>

            {/* Progress indicator for running scans - Terminal Style */}
            {(scanResult.status === 'running' || scanResult.status === 'queued') && scanProgress && (
              <div className="mt-4 p-6 bg-gray-900 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-mono font-medium text-green-400">
                    $ {scanProgress.stage.replace('-', '_')}
                  </span>
                  <span className="text-sm font-mono text-gray-400">{scanProgress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${scanProgress.percentage}%` }}
                  ></div>
                </div>
                <p className="text-sm font-mono text-gray-300">{scanProgress.message}</p>
                {scanProgress.currentTask && (
                  <p className="text-xs font-mono text-green-400 mt-2">
                    → {scanProgress.currentTask}
                  </p>
                )}
              </div>
            )}

            {/* Error indicator for failed scans */}
            {scanResult.status === 'failed' && scanResult.error && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-900">Scan Failed</span>
                </div>
                <p className="text-sm text-red-800 mt-1">{scanResult.error}</p>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-xl hover:scale-105 transition-all duration-300 hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Vulnerabilities
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold terminal-glow">
                  {scanResult.totalVulnerabilities}
                </div>
                <p className="text-xs text-muted-foreground">
                  Security vulnerabilities found
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl hover:shadow-red-500/20 hover:scale-105 transition-all duration-300 hover:border-red-500/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical</CardTitle>
                <XCircle className="h-4 w-4 text-red-500 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500 glitch-text">
                  {scanResult.criticalCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Immediate attention required
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl hover:shadow-orange-500/20 hover:scale-105 transition-all duration-300 hover:border-orange-500/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500 terminal-glow">
                  {scanResult.highCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Should be fixed soon
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl hover:shadow-blue-500/20 hover:scale-105 transition-all duration-300 hover:border-blue-500/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Medium & Low
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500 terminal-glow">
                  {scanResult.mediumCount + scanResult.lowCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {scanResult.mediumCount}M • {scanResult.lowCount}L
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Vulnerabilities List */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Vulnerabilities</CardTitle>
                  <CardDescription>
                    Detailed list of security issues found
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExportReport('json')}
                    disabled={isExporting || scanResult.status !== 'completed'}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'JSON'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExportReport('csv')}
                    disabled={isExporting || scanResult.status !== 'completed'}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExportReport('html')}
                    disabled={isExporting || scanResult.status !== 'completed'}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    HTML
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {vulnerabilities.length > 0 ? (
                <div className="space-y-4">
                  {vulnerabilities.map((vuln: any, index: number) => {
                    const isExpanded = expandedVulns.has(index);
                    // Create a unique key combining id, package, and index
                    const uniqueKey = `${vuln.id}-${vuln.packageName}-${index}`;
                    return (
                      <div
                        key={uniqueKey}
                        className="border rounded-lg overflow-hidden transition-all hover:shadow-lg hover:border-primary/30"
                      >
                        <div 
                          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors duration-200"
                          onClick={() => toggleVulnExpansion(index)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2 flex-1">
                              {getSeverityIcon(vuln.severity)}
                              <h3 className="font-semibold">{vuln.title || vuln.name || 'Vulnerability'}</h3>
                              <Badge
                                variant={getSeverityBadgeVariant(vuln.severity)}
                              >
                                {vuln.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              {vuln.cvssScore && (
                                <Badge variant="outline" className="text-xs">
                                  CVSS: {vuln.cvssScore}
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span className="flex items-center space-x-1">
                              <FileText className="h-3 w-3" />
                              <span>
                                {vuln.packageName || vuln.name} {vuln.version && `v${vuln.version}`}
                              </span>
                            </span>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t bg-muted/20">
                            <div className="pt-4 space-y-3">
                              {vuln.description && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-1">Description</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {vuln.description}
                                  </p>
                                </div>
                              )}
                              
                              {vuln.id && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-1">Vulnerability ID</h4>
                                  <p className="text-sm text-muted-foreground font-mono">
                                    {vuln.id}
                                  </p>
                                </div>
                              )}
                              
                              {vuln.fixedIn && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-1 text-green-600">Fix Available</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Upgrade to version: <span className="font-semibold">{vuln.fixedIn}</span>
                                  </p>
                                  <code className="text-xs bg-muted px-2 py-1 rounded mt-1 block">
                                    npm install {vuln.packageName || vuln.name}@{vuln.fixedIn}
                                  </code>
                                </div>
                              )}
                              
                              {vuln.fixAvailable && typeof vuln.fixAvailable === 'object' && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-1 text-green-600">Fix Available</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {vuln.fixAvailable.name && `Update ${vuln.fixAvailable.name}`}
                                    {vuln.fixAvailable.version && ` to version ${vuln.fixAvailable.version}`}
                                  </p>
                                </div>
                              )}
                              
                              {vuln.via && Array.isArray(vuln.via) && vuln.via.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-1">Vulnerability Chain</h4>
                                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                                    {vuln.via.map((v: any, i: number) => (
                                      <li key={i}>{typeof v === 'string' ? v : v.title || v.name || 'Unknown'}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {vuln.references && vuln.references.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-1">References</h4>
                                  <div className="space-y-1">
                                    {vuln.references.slice(0, 5).map((ref: any, i: number) => (
                                      <a
                                        key={i}
                                        href={typeof ref === 'string' ? ref : ref.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-1 text-sm text-primary hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        <span>{typeof ref === 'string' ? ref : ref.url}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* AI Fix Suggestion */}
                              <div className="border-t pt-3 mt-3">
                                {!aiSuggestions.has(uniqueKey) ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      getAiFixSuggestion(vuln, uniqueKey);
                                    }}
                                    disabled={loadingAiSuggestion === uniqueKey}
                                    className="w-full"
                                  >
                                    {loadingAiSuggestion === uniqueKey ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating AI Fix Suggestion...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Get AI Fix Suggestion (Gemini)
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                                      <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                                      AI-Powered Fix Suggestion
                                    </h4>
                                    <div className="text-sm text-muted-foreground bg-purple-50 dark:bg-purple-950/20 p-3 rounded-md prose prose-sm max-w-none whitespace-pre-wrap">
                                      {aiSuggestions.get(uniqueKey)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Vulnerabilities Found
                  </h3>
                  <p className="text-muted-foreground">
                    Great! Your code appears to be secure.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deployment Manager - Only show if scan is completed */}
          {scanResult.status === 'completed' && (
            <DeploymentManager
              scanPassed={scanResult.criticalCount === 0 && scanResult.highCount === 0}
              projectName={project ? `${project.owner}/${project.name}` : "project"}
            />
          )}

          {/* Scan Details */}
          <Card>
            <CardHeader>
              <CardTitle>Scan Details</CardTitle>
              <CardDescription>
                Technical information about this scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Scan Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scan ID:</span>
                      <span className="font-mono">{scanId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Started:</span>
                      <span>{scanResult.startedAt.toLocaleString()}</span>
                    </div>
                    {scanResult.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Completed:
                        </span>
                        <span>{scanResult.completedAt.toLocaleString()}</span>
                      </div>
                    )}
                    {scanResult.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{Math.round((scanResult.completedAt.getTime() - scanResult.startedAt.getTime()) / 1000)}s</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Scan Options</h4>
                  <div className="flex flex-wrap gap-2">
                    {scanResult.scanOptions.enableOSV && (
                      <Badge variant="outline">OSV</Badge>
                    )}
                    {scanResult.scanOptions.enableNpmAudit && (
                      <Badge variant="outline">npm audit</Badge>
                    )}
                    {scanResult.scanOptions.scanDependencies && (
                      <Badge variant="outline">Dependencies</Badge>
                    )}
                    {scanResult.scanOptions.scanCode && (
                      <Badge variant="outline">Code Security</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
