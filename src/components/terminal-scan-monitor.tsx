'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useScanStore } from '@/store/scan-store';

interface TerminalLine {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'command';
  timestamp: Date;
}

interface TerminalScanMonitorProps {
  scanId?: string;
  isScanning?: boolean;
  progress?: {
    stage: string;
    percentage: number;
    message: string;
    currentTask?: string;
  };
}

export function TerminalScanMonitor({ scanId, isScanning, progress: propProgress }: TerminalScanMonitorProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [showCursor, setShowCursor] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const lastTaskRef = useRef<string>('');
  
  // Get progress from store if scanId is provided
  const storeProgress = useScanStore((state) => 
    scanId ? state.getScanProgress(scanId) : undefined
  );
  
  // Use store progress if available, otherwise use prop progress
  const progress = storeProgress || propProgress;

  // Cursor blink effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Initialize terminal
  useEffect(() => {
    const initLines: TerminalLine[] = [
      { text: '╔═══════════════════════════════════════════════════════════╗', type: 'info', timestamp: new Date() },
      { text: '║         DevSecOps Security Scanner v1.0.0                ║', type: 'info', timestamp: new Date() },
      { text: '║         Terminal Interface - Real-time Monitoring         ║', type: 'info', timestamp: new Date() },
      { text: '╚═══════════════════════════════════════════════════════════╝', type: 'info', timestamp: new Date() },
      { text: '', type: 'info', timestamp: new Date() },
      { text: '> Initializing security scanner...', type: 'command', timestamp: new Date() },
      { text: '✓ Scanner modules loaded', type: 'success', timestamp: new Date() },
      { text: '✓ Database connection established', type: 'success', timestamp: new Date() },
      { text: '✓ API endpoints ready', type: 'success', timestamp: new Date() },
      { text: '', type: 'info', timestamp: new Date() },
    ];
    setLines(initLines);
    
    // Listen to console logs if scanId is provided
    if (scanId && typeof window !== 'undefined') {
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      const logInterceptor = (...args: any[]) => {
        originalLog(...args);
        const message = args.join(' ');
        
        // Filter out Fast Refresh, HMR, and other development logs
        if (
          message.includes('[Fast Refresh]') ||
          message.includes('HMR') ||
          message.includes('hot-reload') ||
          message.includes('webpack') ||
          message.includes('Compiled') ||
          message.includes('compiling') ||
          message.length === 0
        ) {
          return;
        }
        
        setLines(prev => [...prev, {
          text: message,
          type: message.includes('✓') || message.includes('✅') ? 'success' : 
                message.includes('❌') || message.includes('Error') ? 'error' :
                message.includes('⚠️') || message.includes('Warning') ? 'warning' :
                message.startsWith('🔍') || message.startsWith('📥') || message.startsWith('🐳') ? 'info' : 'info',
          timestamp: new Date()
        }]);
      };
      
      console.log = logInterceptor;
      console.error = (...args: any[]) => {
        originalError(...args);
        setLines(prev => [...prev, {
          text: args.join(' '),
          type: 'error',
          timestamp: new Date()
        }]);
      };
      console.warn = (...args: any[]) => {
        originalWarn(...args);
        setLines(prev => [...prev, {
          text: args.join(' '),
          type: 'warning',
          timestamp: new Date()
        }]);
      };
      
      return () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, [scanId]);

  // Update based on progress
  useEffect(() => {
    if (!progress) return;

    const newLines: TerminalLine[] = [];
    
    // Only add stage line if it changed
    if (progress.stage) {
      newLines.push({
        text: `> ${progress.stage.toUpperCase().replace(/-/g, '_')}`,
        type: 'command',
        timestamp: new Date()
      });
    }

    if (progress.message) {
      newLines.push({
        text: `  ${progress.message}`,
        type: 'info',
        timestamp: new Date()
      });
    }

    // Only add task line if it's different from the last one
    if (progress.currentTask && progress.currentTask !== lastTaskRef.current) {
      lastTaskRef.current = progress.currentTask;
      
      // Map task names to user-friendly display names
      const taskDisplayNames: Record<string, string> = {
        'npm-audit': '🔍 Running npm audit scan...',
        'osv-scan': '🔍 Querying OSV.dev vulnerability database...',
        'snyk-scan': '🔍 Running Snyk vulnerability scanner...',
        'trivy-scan': '🔍 Running Trivy container security scan...',
        'github-actions-scan': '🔍 Analyzing GitHub Actions workflows...',
        'container-scan': '🔍 Scanning container images...',
        'code-analysis': '🔍 Analyzing code for security issues...'
      };
      
      const displayName = taskDisplayNames[progress.currentTask] || `  → ${progress.currentTask}`;
      newLines.push({
        text: displayName,
        type: 'info',
        timestamp: new Date()
      });
    }

    const progressValue = 'progress' in progress ? progress.progress : ('percentage' in progress ? progress.percentage : 0);
    if (progressValue && progressValue > 0) {
      const barLength = 40;
      const filled = Math.round((progressValue / 100) * barLength);
      const empty = barLength - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      newLines.push({
        text: `  [${bar}] ${progressValue}%`,
        type: 'info',
        timestamp: new Date()
      });
    }

    if (newLines.length > 0) {
      setLines(prev => [...prev, ...newLines]);
    }
  }, [progress]);

  const getLineColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'command': return 'text-cyan-400 font-bold';
      default: return 'text-green-300';
    }
  };



  return (
    <Card className="terminal-window bg-black border-green-700 shadow-2xl">
      {/* Terminal Header */}
      <div className="terminal-header bg-green-900/30 border-b border-green-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-green-400" />
          <span className="text-sm font-mono text-green-400">
            security-scanner.sh
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isScanning && (
            <>
              <Activity className="h-3 w-3 text-green-400 animate-pulse" />
              <span className="text-xs font-mono text-green-400">SCANNING</span>
            </>
          )}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>
      </div>

      {/* Terminal Body */}
      <div 
        ref={terminalRef}
        className="terminal-body bg-black p-6 font-mono text-sm text-green-400 h-96 overflow-y-auto terminal-scanline"
      >
        {lines.map((line, index) => (
          <div key={index} className={`terminal-line ${getLineColor(line.type)}`}>
            {line.text}
          </div>
        ))}
        
        {isScanning && (
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="h-4 w-4 animate-spin text-green-400" />
            <span className="text-green-400">Processing...</span>
            {showCursor && <span className="text-green-400">▊</span>}
          </div>
        )}
        
        {!isScanning && lines.length > 0 && (
          <div className="mt-2">
            <span className="text-green-400">$</span>
            {showCursor && <span className="text-green-400 ml-1">▊</span>}
          </div>
        )}
      </div>

      {/* Terminal Footer */}
      <div className="border-t border-green-700 bg-green-900/20 px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-4 text-green-400">
          <span>Lines: {lines.length}</span>
          {scanId && <span>Scan: {scanId.slice(-8)}</span>}
        </div>
        <div className="text-green-400">
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </Card>
  );
}
