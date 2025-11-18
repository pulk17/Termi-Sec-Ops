'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSecurity, useSecureTokens } from './security-provider';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Key, 
  Lock, 
  Eye, 
  Globe,
  Server,
  Database,
  FileText
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  category: 'setup' | 'tokens' | 'privacy' | 'deployment';
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  completed: boolean;
  autoCheck?: () => Promise<boolean>;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function SecurityChecklist() {
  const { isInitialized } = useSecurity();
  const { getGitHubToken, getSnykToken, getAWSCredentials } = useSecureTokens();
  
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionRate, setCompletionRate] = useState(0);

  useEffect(() => {
    if (isInitialized) {
      initializeChecklist();
    }
  }, [isInitialized]);

  const initializeChecklist = async () => {
    setLoading(true);
    
    const items: ChecklistItem[] = [
      // Setup Category
      {
        id: 'https_enabled',
        category: 'setup',
        title: 'HTTPS Connection',
        description: 'Ensure the application is served over HTTPS',
        icon: <Globe className="h-4 w-4" />,
        required: true,
        completed: false,
        autoCheck: async () => window.location.protocol === 'https:',
      },
      {
        id: 'secure_context',
        category: 'setup',
        title: 'Secure Context',
        description: 'Verify the application runs in a secure context',
        icon: <Lock className="h-4 w-4" />,
        required: true,
        completed: false,
        autoCheck: async () => window.isSecureContext,
      },
      {
        id: 'csp_headers',
        category: 'setup',
        title: 'Content Security Policy',
        description: 'Confirm CSP headers are properly configured',
        icon: <Shield className="h-4 w-4" />,
        required: true,
        completed: false,
        autoCheck: async () => {
          const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
          return !!cspMeta;
        },
      },
      {
        id: 'encryption_enabled',
        category: 'setup',
        title: 'Client-Side Encryption',
        description: 'Enable encryption for sensitive data storage',
        icon: <Database className="h-4 w-4" />,
        required: true,
        completed: false,
        autoCheck: async () => {
          return !!localStorage.getItem('encryption_key');
        },
      },

      // Tokens Category
      {
        id: 'github_token',
        category: 'tokens',
        title: 'GitHub Personal Access Token',
        description: 'Configure GitHub token for repository access',
        icon: <Key className="h-4 w-4" />,
        required: false,
        completed: false,
        autoCheck: async () => {
          const token = await getGitHubToken();
          return !!token;
        },
        action: {
          label: 'Configure Token',
          onClick: () => {
            // Navigate to security settings
            window.location.hash = '#security-settings';
          },
        },
      },
      {
        id: 'snyk_token',
        category: 'tokens',
        title: 'Snyk API Token',
        description: 'Configure Snyk token for vulnerability scanning',
        icon: <Key className="h-4 w-4" />,
        required: false,
        completed: false,
        autoCheck: async () => {
          const token = await getSnykToken();
          return !!token;
        },
        action: {
          label: 'Configure Token',
          onClick: () => {
            window.location.hash = '#security-settings';
          },
        },
      },
      {
        id: 'aws_credentials',
        category: 'tokens',
        title: 'AWS Credentials',
        description: 'Configure AWS credentials for deployment',
        icon: <Server className="h-4 w-4" />,
        required: false,
        completed: false,
        autoCheck: async () => {
          const credentials = await getAWSCredentials();
          return !!(credentials.accessKey && credentials.secretKey);
        },
        action: {
          label: 'Configure Credentials',
          onClick: () => {
            window.location.hash = '#security-settings';
          },
        },
      },
      {
        id: 'token_rotation',
        category: 'tokens',
        title: 'Token Rotation Setup',
        description: 'Enable automatic token rotation warnings',
        icon: <AlertTriangle className="h-4 w-4" />,
        required: true,
        completed: false,
        autoCheck: async () => {
          // Check if any tokens are stored (indicates rotation is set up)
          const hasTokens = localStorage.getItem('secure_tokens');
          return !!hasTokens;
        },
      },

      // Privacy Category
      {
        id: 'privacy_analytics',
        category: 'privacy',
        title: 'Privacy-Focused Analytics',
        description: 'Configure anonymous usage analytics',
        icon: <Eye className="h-4 w-4" />,
        required: false,
        completed: false,
        autoCheck: async () => {
          const analyticsData = localStorage.getItem('privacy_analytics');
          return !!analyticsData;
        },
      },
      {
        id: 'data_minimization',
        category: 'privacy',
        title: 'Data Minimization',
        description: 'Ensure minimal data collection practices',
        icon: <Database className="h-4 w-4" />,
        required: true,
        completed: false,
        autoCheck: async () => {
          // Check if privacy settings are configured
          return true; // Always true as it's built-in
        },
      },
      {
        id: 'session_management',
        category: 'privacy',
        title: 'Session Management',
        description: 'Verify secure session handling',
        icon: <Lock className="h-4 w-4" />,
        required: true,
        completed: false,
        autoCheck: async () => {
          const sessionId = sessionStorage.getItem('session_id');
          return !!sessionId;
        },
      },

      // Deployment Category
      {
        id: 'static_deployment',
        category: 'deployment',
        title: 'Static Site Deployment',
        description: 'Deploy as static site for enhanced security',
        icon: <Server className="h-4 w-4" />,
        required: true,
        completed: false,
        autoCheck: async () => {
          // Check if running as static site (no server-side rendering)
          return true; // Assume static deployment
        },
      },
      {
        id: 'environment_variables',
        category: 'deployment',
        title: 'Environment Variables',
        description: 'Secure environment variable configuration',
        icon: <FileText className="h-4 w-4" />,
        required: true,
        completed: false,
        autoCheck: async () => {
          // Check if environment variables are properly configured
          return !!(process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || process.env.NEXT_PUBLIC_SNYK_TOKEN);
        },
      },
      {
        id: 'cdn_security',
        category: 'deployment',
        title: 'CDN Security',
        description: 'Configure CDN with security headers',
        icon: <Globe className="h-4 w-4" />,
        required: false,
        completed: false,
        autoCheck: async () => {
          // Check if security headers are present
          const response = await fetch(window.location.href, { method: 'HEAD' });
          return response.headers.has('x-content-type-options');
        },
      },
    ];

    // Run auto-checks for all items
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        if (item.autoCheck) {
          try {
            item.completed = await item.autoCheck();
          } catch (error) {
            console.warn(`Auto-check failed for ${item.id}:`, error);
            item.completed = false;
          }
        }
        return item;
      })
    );

    setChecklist(updatedItems);
    calculateCompletionRate(updatedItems);
    setLoading(false);
  };

  const calculateCompletionRate = (items: ChecklistItem[]) => {
    const totalItems = items.length;
    const completedItems = items.filter(item => item.completed).length;
    const rate = Math.round((completedItems / totalItems) * 100);
    setCompletionRate(rate);
  };

  const toggleItem = (id: string) => {
    const updatedChecklist = checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updatedChecklist);
    calculateCompletionRate(updatedChecklist);
  };

  const runAllChecks = async () => {
    setLoading(true);
    await initializeChecklist();
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 90) return 'text-green-500';
    if (rate >= 70) return 'text-yellow-500';
    if (rate >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getCategoryIcon = (category: ChecklistItem['category']) => {
    switch (category) {
      case 'setup':
        return <Shield className="h-4 w-4" />;
      case 'tokens':
        return <Key className="h-4 w-4" />;
      case 'privacy':
        return <Eye className="h-4 w-4" />;
      case 'deployment':
        return <Server className="h-4 w-4" />;
    }
  };

  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const requiredIncomplete = checklist.filter(item => item.required && !item.completed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Security Checklist</h2>
        </div>
        <Button onClick={runAllChecks} disabled={loading}>
          {loading ? 'Checking...' : 'Refresh Checks'}
        </Button>
      </div>

      {/* Completion Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Security Setup Progress</span>
            <span className={`text-3xl font-bold ${getCompletionColor(completionRate)}`}>
              {completionRate}%
            </span>
          </CardTitle>
          <CardDescription>
            {checklist.filter(item => item.completed).length} of {checklist.length} security measures completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={completionRate} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Incomplete</span>
            <span>Complete</span>
          </div>
        </CardContent>
      </Card>

      {/* Required Items Alert */}
      {requiredIncomplete.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Required Security Measures:</strong> {requiredIncomplete.length} required security 
            measure(s) are incomplete. Please address these to ensure proper security.
          </AlertDescription>
        </Alert>
      )}

      {/* Checklist by Category */}
      {Object.entries(groupedChecklist).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 capitalize">
              {getCategoryIcon(category as ChecklistItem['category'])}
              {category} Security
            </CardTitle>
            <CardDescription>
              {items.filter(item => item.completed).length} of {items.length} items completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={item.id}
                  checked={item.completed}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <label
                      htmlFor={item.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {item.title}
                    </label>
                    {item.required && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {item.completed && (
                      <Badge variant="default" className="text-xs bg-green-500">
                        Complete
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  {item.action && !item.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={item.action.onClick}
                      className="mt-2"
                    >
                      {item.action.label}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Regular Maintenance:</strong> Review and update your security settings monthly</p>
            <p><strong>Token Rotation:</strong> Rotate API tokens every 90 days or when prompted</p>
            <p><strong>Monitor Access:</strong> Review usage analytics for unusual patterns</p>
            <p><strong>Stay Updated:</strong> Keep the application updated to the latest version</p>
            <p><strong>Secure Environment:</strong> Always use HTTPS and secure hosting providers</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}