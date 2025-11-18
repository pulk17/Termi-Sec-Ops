'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Database, 
  Wifi, 
  WifiOff, 
  Trash2, 
  RefreshCw,
  Zap,
  HardDrive
} from 'lucide-react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'good' | 'warning' | 'poor';
}

export function PerformanceDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Check service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => setIsServiceWorkerReady(true));
      }
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Update metrics from Web Vitals API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      const newMetrics: PerformanceMetric[] = [
        {
          name: 'First Contentful Paint',
          value: fcp,
          unit: 'ms',
          threshold: 1800,
          status: fcp < 1800 ? 'good' : fcp < 3000 ? 'warning' : 'poor'
        },
        {
          name: 'DOM Content Loaded',
          value: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
          unit: 'ms',
          threshold: 2500,
          status: 'good'
        }
      ];

      setMetrics(newMetrics);
    };

    if (document.readyState === 'complete') {
      updateMetrics();
    } else {
      window.addEventListener('load', updateMetrics);
      return () => window.removeEventListener('load', updateMetrics);
    }
  }, []);

  const handleClearCaches = async () => {
    setIsClearing(true);
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    } finally {
      setIsClearing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'good': return 'default';
      case 'warning': return 'secondary';
      case 'poor': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Service Worker</span>
            </div>
            <Badge variant={isServiceWorkerReady ? 'default' : 'secondary'}>
              {isServiceWorkerReady ? 'Active' : 'Inactive'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">PWA</span>
            </div>
            <Badge variant="outline">Enabled</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Web Vitals</span>
              </CardTitle>
              <CardDescription>
                Core performance metrics for user experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.map((metric) => (
                  <div key={metric.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{metric.name}</span>
                      <Badge variant={getStatusVariant(metric.status)}>
                        {metric.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={Math.min((metric.value / (metric.threshold * 2)) * 100, 100)}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono min-w-[80px]">
                        {metric.value > 0 ? `${metric.value.toFixed(1)}${metric.unit}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Cache Management</span>
              </CardTitle>
              <CardDescription>
                Application uses next-pwa for automatic caching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The application automatically caches static assets and API responses for offline use.
                Cache is managed by the service worker.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5" />
                <span>Cache Management</span>
              </CardTitle>
              <CardDescription>
                Manage application cache and storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Clear All Caches</h4>
                  <p className="text-sm text-muted-foreground">
                    Remove all cached data to free up storage space
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleClearCaches}
                  disabled={isClearing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isClearing ? 'Clearing...' : 'Clear Cache'}
                </Button>
              </div>


            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}