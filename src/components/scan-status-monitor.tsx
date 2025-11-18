"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Clock, 
  X, 
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { useScanStore } from "@/store/scan-store";
import { formatRelativeTime } from "@/lib/utils";
import { ClientOnly } from "@/components/client-only";
import Link from "next/link";

export function ScanStatusMonitor() {
  const { activeScans, scanResults, cancelScan } = useScanStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCancelScan = (scanId: string) => {
    cancelScan(scanId);
  };

  const activeScansList = Array.from(activeScans.entries()).map(([scanId, progress]) => {
    const result = scanResults.get(scanId);
    return {
      scanId,
      projectName: `Project #${result?.projectId || 'Unknown'}`,
      status: progress.stage,
      progress: {
        stage: progress.stage,
        percentage: progress.progress,
        message: progress.message
      },
      startedAt: result?.startedAt || new Date()
    };
  });

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Active Scans</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeScansList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Active Scans</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active scans</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Active Scans</span>
            <Badge className="bg-blue-100 text-blue-800">
              {activeScansList.length}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeScansList.map((scan) => (
          <div key={scan.scanId} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium">{scan.projectName}</h4>
                <p className="text-sm text-muted-foreground">
                  <ClientOnly fallback="Started loading...">
                    Started {formatRelativeTime(scan.startedAt)}
                  </ClientOnly>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  className={
                    scan.status === 'scanning' || scan.status === 'analyzing'
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {scan.status}
                </Badge>
                <Button asChild size="sm" className="h-8 w-8 p-0">
                  <Link href={`/scan/results/${scan.scanId}`}>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
                <Button 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => handleCancelScan(scan.scanId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {scan.progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {scan.progress.stage.charAt(0).toUpperCase() + 
                     scan.progress.stage.slice(1).replace('-', ' ')}
                  </span>
                  <span>{scan.progress.percentage}%</span>
                </div>
                <Progress value={scan.progress.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {scan.progress.message}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}