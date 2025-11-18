'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  GitBranch, 
  Shield, 
  Settings, 
  FileText, 
  Download, 
  Play, 
  Pause, 
  RefreshCw,
  Home,
  BarChart3,
  Cloud,
  Database,
  Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'navigation' | 'actions' | 'scans' | 'settings';
  keywords: string[];
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
  onAction?: (action: string, params?: unknown) => void;
}

export function CommandPalette({ isOpen, onClose, onNavigate, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      description: 'View security metrics and scan results',
      icon: <Home className="h-4 w-4" />,
      category: 'navigation',
      keywords: ['dashboard', 'home', 'overview', 'metrics'],
      action: () => onNavigate?.('/dashboard'),
      shortcut: 'Ctrl+D'
    },
    {
      id: 'nav-scan',
      title: 'New Scan',
      description: 'Start a new repository security scan',
      icon: <Shield className="h-4 w-4" />,
      category: 'navigation',
      keywords: ['scan', 'new', 'security', 'repository'],
      action: () => onNavigate?.('/scan'),
      shortcut: 'Ctrl+N'
    },
    {
      id: 'nav-reports',
      title: 'View Reports',
      description: 'Browse vulnerability reports and analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'navigation',
      keywords: ['reports', 'analytics', 'vulnerabilities', 'charts'],
      action: () => onNavigate?.('/reports')
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      description: 'Configure API keys and preferences',
      icon: <Settings className="h-4 w-4" />,
      category: 'navigation',
      keywords: ['settings', 'config', 'api', 'preferences'],
      action: () => onNavigate?.('/settings'),
      shortcut: 'Ctrl+,'
    },

    // Actions
    {
      id: 'action-refresh',
      title: 'Refresh Data',
      description: 'Reload all scan results and metrics',
      icon: <RefreshCw className="h-4 w-4" />,
      category: 'actions',
      keywords: ['refresh', 'reload', 'update', 'sync'],
      action: () => onAction?.('refresh'),
      shortcut: 'Ctrl+R'
    },
    {
      id: 'action-export',
      title: 'Export Report',
      description: 'Download vulnerability report as PDF or JSON',
      icon: <Download className="h-4 w-4" />,
      category: 'actions',
      keywords: ['export', 'download', 'report', 'pdf', 'json'],
      action: () => onAction?.('export')
    },
    {
      id: 'action-github-connect',
      title: 'Connect GitHub',
      description: 'Authenticate with GitHub for repository access',
      icon: <GitBranch className="h-4 w-4" />,
      category: 'actions',
      keywords: ['github', 'connect', 'auth', 'repository'],
      action: () => onAction?.('github-connect')
    },
    {
      id: 'action-aws-connect',
      title: 'Connect AWS',
      description: 'Configure AWS credentials for ECR/ECS scanning',
      icon: <Cloud className="h-4 w-4" />,
      category: 'actions',
      keywords: ['aws', 'connect', 'ecr', 'ecs', 'cloud'],
      action: () => onAction?.('aws-connect')
    },

    // Scan Actions
    {
      id: 'scan-quick',
      title: 'Quick Scan',
      description: 'Run a fast vulnerability scan on current repository',
      icon: <Play className="h-4 w-4" />,
      category: 'scans',
      keywords: ['quick', 'scan', 'fast', 'vulnerability'],
      action: () => onAction?.('quick-scan')
    },
    {
      id: 'scan-full',
      title: 'Full Security Scan',
      description: 'Comprehensive scan with all security tools',
      icon: <Shield className="h-4 w-4" />,
      category: 'scans',
      keywords: ['full', 'comprehensive', 'security', 'scan', 'all'],
      action: () => onAction?.('full-scan')
    },
    {
      id: 'scan-stop',
      title: 'Stop Current Scan',
      description: 'Cancel the currently running scan',
      icon: <Pause className="h-4 w-4" />,
      category: 'scans',
      keywords: ['stop', 'cancel', 'pause', 'abort'],
      action: () => onAction?.('stop-scan')
    },

    // Settings
    {
      id: 'settings-theme',
      title: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      icon: <Settings className="h-4 w-4" />,
      category: 'settings',
      keywords: ['theme', 'dark', 'light', 'mode'],
      action: () => onAction?.('toggle-theme'),
      shortcut: 'Ctrl+Shift+T'
    },
    {
      id: 'settings-clear-data',
      title: 'Clear Local Data',
      description: 'Remove all stored scan results and cache',
      icon: <Database className="h-4 w-4" />,
      category: 'settings',
      keywords: ['clear', 'data', 'cache', 'storage', 'reset'],
      action: () => onAction?.('clear-data')
    }
  ];

  const filteredCommands = commands.filter(command => {
    if (!query) return true;
    
    const searchTerms = query.toLowerCase().split(' ');
    return searchTerms.every(term =>
      command.title.toLowerCase().includes(term) ||
      command.description.toLowerCase().includes(term) ||
      command.keywords.some(keyword => keyword.toLowerCase().includes(term))
    );
  });

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, Command[]>);

  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Actions',
    scans: 'Scans',
    settings: 'Settings'
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[20vh]">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[60vh] overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-lg"
            autoFocus
          />
          <Badge variant="outline" className="text-xs">
            ESC
          </Badge>
        </div>

        {/* Commands List */}
        <div className="overflow-y-auto max-h-[40vh]">
          {Object.entries(groupedCommands).map(([category, commands]) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </div>
              {commands.map((command, index) => {
                const globalIndex = filteredCommands.indexOf(command);
                const isSelected = globalIndex === selectedIndex;
                
                return (
                  <button
                    key={command.id}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-muted' : ''
                    }`}
                    onClick={() => {
                      command.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                  >
                    <div className="flex-shrink-0 text-muted-foreground">
                      {command.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{command.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {command.description}
                      </div>
                    </div>
                    {command.shortcut && (
                      <Badge variant="outline" className="text-xs">
                        {command.shortcut}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          
          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No commands found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">↑↓</Badge>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">Enter</Badge>
              Select
            </span>
          </div>
          <span>
            {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// Hook for command palette
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  };
}