'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Terminal, 
  AlertTriangle, 
  Shield, 
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  Code,
  Package,
  Server
} from 'lucide-react';
import { useScanStore } from '@/store/scan-store';
import { VulnerabilityDetailPanel } from './vulnerability-detail-panel';

export function DevSecOpsDashboard() {
  const { scanResults, currentScanId } = useScanStore();
  const [selectedVuln, setSelectedVuln] = useState<any>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

  // Get the most recent completed scan
  const allScans = Array.from(scanResults.values());
  const completedScans = allScans.filter(scan => scan.status === 'completed');
  const currentScan = completedScans.length > 0 
    ? completedScans.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]
    : null;

  useEffect(() => {
    // Simulate terminal output
    const outputs = [
      '> Initializing DevSecOps Pipeline...',
      '> Loading security scanners...',
      '> npm audit: READY',
      '> OSV database: CONNECTED',
      '> Snyk API: AUTHENTICATED',
      `> Total scans: ${allScans.length}`,
      `> Active vulnerabilities: ${currentScan?.summary.totalVulnerabilities || 0}`,
      '> System ready.'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < outputs.length) {
        setTerminalOutput(prev => [...prev, outputs[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [allScans.length, currentScan]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-950 border-red-800';
      case 'high': return 'text-orange-500 bg-orange-950 border-orange-800';
      case 'medium': return 'text-yellow-500 bg-yellow-950 border-yellow-800';
      case 'low': return 'text-green-500 bg-green-950 border-green-800';
      default: return 'text-gray-500 bg-gray-950 border-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-6">
      {/* Terminal Header */}
      <div className="border border-green-800 rounded-lg mb-6 bg-gray-950">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-950 border-b border-green-800">
          <Terminal className="h-4 w-4" />
          <span className="text-sm">DevSecOps Security Terminal v1.0.0</span>
        </div>
        <div className="p-4 h-32 overflow-y-auto">
          {terminalOutput.map((line, i) => (
            <div key={i} className="text-xs mb-1">
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gray-950 border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-400 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              SECURITY SCORE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {currentScan?.summary.securityScore || 100}
              <span className="text-sm text-gray-500">/100</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {currentScan?.summary.riskLevel.toUpperCase() || 'UNKNOWN'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-950 border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              CRITICAL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">
              {currentScan?.summary.criticalCount || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              IMMEDIATE ACTION REQUIRED
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-950 border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-400 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              HIGH SEVERITY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400">
              {currentScan?.summary.highCount || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              PRIORITY FIXES
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-950 border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              TOTAL SCANS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {allScans.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              COMPLETED ASSESSMENTS
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerability List */}
      <Card className="bg-gray-950 border-green-800 mb-6">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <Code className="h-5 w-5" />
            VULNERABILITY REPORT
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentScan && currentScan.vulnerabilities.length > 0 ? (
            <div className="space-y-2">
              {currentScan.vulnerabilities.slice(0, 20).map((vuln: any, index: number) => (
                <div
                  key={index}
                  className={`border rounded p-3 cursor-pointer hover:bg-gray-900 transition-colors ${getSeverityColor(vuln.severity)}`}
                  onClick={() => setSelectedVuln(vuln)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4" />
                        <span className="font-semibold">{vuln.packageName}</span>
                        <Badge variant="outline" className="text-xs">
                          {vuln.version}
                        </Badge>
                        <Badge className={`text-xs ${getSeverityColor(vuln.severity)}`}>
                          {vuln.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-400 mb-1">
                        {vuln.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {vuln.id} | Source: {vuln.source}
                      </div>
                    </div>
                    <div className="text-right">
                      {vuln.cvssScore && (
                        <div className="text-sm font-bold">
                          CVSS: {vuln.cvssScore}
                        </div>
                      )}
                      {vuln.fixedIn && (
                        <div className="text-xs text-green-400 mt-1">
                          Fix: {vuln.fixedIn}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No vulnerabilities detected</p>
              <p className="text-xs mt-2">Run a security scan to see results</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan History */}
      <Card className="bg-gray-950 border-green-800">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            SCAN HISTORY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allScans.slice(0, 10).map((scan) => (
              <div
                key={scan.scanId}
                className="border border-gray-800 rounded p-3 hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-300">
                      Scan #{scan.scanId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {scan.startedAt.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">
                        {scan.summary.totalVulnerabilities} issues
                      </div>
                      <div className="text-xs text-gray-500">
                        Score: {scan.summary.securityScore}
                      </div>
                    </div>
                    <Badge
                      variant={scan.status === 'completed' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {scan.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vulnerability Detail Panel */}
      {selectedVuln && (
        <VulnerabilityDetailPanel
          vulnerability={selectedVuln}
          onClose={() => setSelectedVuln(null)}
        />
      )}
    </div>
  );
}
