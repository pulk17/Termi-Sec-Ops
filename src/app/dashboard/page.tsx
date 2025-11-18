'use client';

import { Shield, Github, BarChart3, AlertTriangle, CheckCircle, Clock, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjects, useScanResults, useAnalytics } from '@/hooks/useDatabase';
import { formatRelativeTime } from '@/lib/utils';
import { ScanStatusMonitor } from '@/components/scan-status-monitor';
import { ClientOnly } from '@/components/client-only';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { projects, loading: projectsLoading, refreshProjects } = useProjects();
  const { scanResults, loading: scanResultsLoading, refreshScanResults } = useScanResults();
  const { stats, loading: analyticsLoading, refreshAnalytics, cleanupOldScans } = useAnalytics();
  const [isClearing, setIsClearing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);



  const recentScans = scanResults.slice(0, 5);
  const recentProjects = projects.slice(0, 5);

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear old scan history? This will remove scans older than 30 days and cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      const deletedCount = await cleanupOldScans(30);
      toast.success(`Cleared ${deletedCount} old scan results`);
      // Refresh all data
      await Promise.all([
        refreshScanResults(),
        refreshAnalytics(),
        refreshProjects()
      ]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleRefreshAll = async () => {
    try {
      await Promise.all([
        refreshScanResults(),
        refreshAnalytics(),
        refreshProjects()
      ]);
      toast.success('Dashboard refreshed');
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
      toast.error('Failed to refresh dashboard');
    }
  };

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
            <Button variant="ghost" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRefreshAll}
              disabled={!isMounted || projectsLoading || scanResultsLoading || analyticsLoading}
              title="Refresh dashboard data"
            >
              <RefreshCw className={`h-4 w-4 ${(projectsLoading || scanResultsLoading || analyticsLoading) ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleClearHistory}
              disabled={!isMounted || isClearing}
              title="Clear old scan history (30+ days)"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button asChild>
              <Link href="/scan">
                <Plus className="mr-2 h-4 w-4" />
                New Scan
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-xl text-muted-foreground">
              Overview of your security scans and projects
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <Github className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projectsLoading ? '...' : stats?.totalProjects || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.scannedProjects || 0} scanned
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {scanResultsLoading ? '...' : stats?.totalScans || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Vulnerabilities</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsLoading ? '...' : Math.round(stats?.averageVulnerabilities || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per scan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Security Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsLoading ? '...' : stats?.averageSecurityScore !== undefined ? Math.round(stats.averageSecurityScore) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.averageCvssScore !== undefined ? `CVSS: ${stats.averageCvssScore.toFixed(1)}` : 'No scans yet'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Status Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <ScanStatusMonitor />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Status</CardTitle>
                <CardDescription>
                  Current system activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Database</span>
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400">
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Projects</span>
                  <span className="text-sm font-medium">
                    {projectsLoading ? '...' : projects.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Scans</span>
                  <span className="text-sm font-medium">
                    {scanResultsLoading ? '...' : scanResults.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Scans</span>
                  <span className="text-sm font-medium">
                    {scanResults.filter(scan => scan.status === 'running' || scan.status === 'queued').length}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last updated</span>
                    <ClientOnly fallback="--:--:--">
                      <span suppressHydrationWarning>
                        {new Date().toLocaleTimeString()}
                      </span>
                    </ClientOnly>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Scans */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Scans</span>
                  <div className="flex items-center space-x-2">
                    {scanResults.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {scanResults.length} total
                      </Badge>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  Latest security scans and their results - Click to view details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scanResultsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recentScans.length > 0 ? (
                  <div className="space-y-4">
                    {recentScans.map((scan) => (
                      <Link key={scan.id} href={`/scan/results/${scan.scanId}`}>
                        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${
                              scan.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
                              scan.status === 'failed' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' :
                              scan.status === 'running' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' :
                              'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'
                            }`}>
                              {scan.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                               scan.status === 'failed' ? <AlertTriangle className="h-4 w-4" /> :
                               <Clock className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-medium">Scan #{scan.scanId.slice(-8)}</p>
                              <p className="text-sm text-muted-foreground">
                                <ClientOnly fallback="Loading...">
                                  <span suppressHydrationWarning>
                                    {formatRelativeTime(scan.startedAt)}
                                  </span>
                                </ClientOnly>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {scan.status === 'completed' && (
                              <>
                                <Badge variant="destructive" className="text-xs">
                                  {scan.criticalCount}C
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {scan.highCount}H
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {scan.mediumCount}M
                                </Badge>
                              </>
                            )}
                            <Badge variant={
                              scan.status === 'completed' ? 'default' :
                              scan.status === 'failed' ? 'destructive' :
                              'secondary'
                            }>
                              {scan.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No scans yet</p>
                    <Button asChild>
                      <Link href="/scan">Start Your First Scan</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
                <CardDescription>
                  Your recently added repositories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recentProjects.length > 0 ? (
                  <div className="space-y-4">
                    {recentProjects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                            <Github className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {project.owner} • {project.language || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {project.isPrivate && (
                            <Badge variant="outline" className="text-xs">Private</Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            <ClientOnly fallback="Loading...">
                              <span suppressHydrationWarning>
                                {project.lastScanned ? formatRelativeTime(project.lastScanned) : 'Never scanned'}
                              </span>
                            </ClientOnly>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Github className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No projects yet</p>
                    <Button asChild>
                      <Link href="/scan">Add Your First Project</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button asChild variant="outline" className="w-full justify-start h-auto p-4">
                  <Link href="/scan">
                    <div className="flex items-center space-x-3">
                      <Plus className="h-5 w-5" />
                      <div className="text-left">
                        <p className="font-medium">New Scan</p>
                        <p className="text-sm text-muted-foreground">Scan a repository</p>
                      </div>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="w-full justify-start h-auto p-4" disabled>
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">View Reports</p>
                      <p className="text-sm text-muted-foreground">Detailed analysis</p>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start h-auto p-4" disabled>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">Settings</p>
                      <p className="text-sm text-muted-foreground">Configure options</p>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}