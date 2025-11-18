'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSecureTokens, usePrivacyAnalytics } from './security-provider';
import { SecurityChecklist } from './security-checklist';
import { Shield, Key, BarChart3, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export function SecuritySettings() {
  const {
    storeGitHubToken,
    getGitHubToken,
    storeSnykToken,
    getSnykToken,
    storeAWSCredentials,
    getAWSCredentials,
    checkTokenRotation,
    removeToken,
  } = useSecureTokens();

  const { getUsageStats, clearAnalytics } = usePrivacyAnalytics();

  const [tokens, setTokens] = useState({
    github: '',
    snyk: '',
    awsAccessKey: '',
    awsSecretKey: '',
    awsRegion: '',
  });

  const [tokenStatus, setTokenStatus] = useState({
    github: false,
    snyk: false,
    aws: false,
  });

  const [expiringTokens, setExpiringTokens] = useState<string[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [settings, setSettings] = useState({
    autoRotateTokens: true,
    enableAnalytics: true,
    secureStorage: true,
  });

  const [showTokens, setShowTokens] = useState({
    github: false,
    snyk: false,
    awsAccessKey: false,
    awsSecretKey: false,
  });

  useEffect(() => {
    loadTokenStatus();
    loadUsageStats();
    checkExpiringTokens();
  }, []);

  const loadTokenStatus = async () => {
    try {
      const [githubToken, snykToken, awsCredentials] = await Promise.all([
        getGitHubToken(),
        getSnykToken(),
        getAWSCredentials(),
      ]);

      setTokenStatus({
        github: !!githubToken,
        snyk: !!snykToken,
        aws: !!(awsCredentials.accessKey && awsCredentials.secretKey),
      });
    } catch (error) {
      console.error('Failed to load token status:', error);
    }
  };

  const loadUsageStats = () => {
    try {
      const stats = getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  };

  const checkExpiringTokens = async () => {
    try {
      const expiring = await checkTokenRotation();
      setExpiringTokens(expiring);
    } catch (error) {
      console.error('Failed to check token expiration:', error);
    }
  };

  const handleSaveToken = async (type: 'github' | 'snyk' | 'aws') => {
    try {
      switch (type) {
        case 'github':
          if (tokens.github) {
            await storeGitHubToken(tokens.github);
            setTokens(prev => ({ ...prev, github: '' }));
          }
          break;
        case 'snyk':
          if (tokens.snyk) {
            await storeSnykToken(tokens.snyk);
            setTokens(prev => ({ ...prev, snyk: '' }));
          }
          break;
        case 'aws':
          if (tokens.awsAccessKey && tokens.awsSecretKey) {
            await storeAWSCredentials(tokens.awsAccessKey, tokens.awsSecretKey, tokens.awsRegion);
            setTokens(prev => ({
              ...prev,
              awsAccessKey: '',
              awsSecretKey: '',
              awsRegion: '',
            }));
          }
          break;
      }
      await loadTokenStatus();
      await checkExpiringTokens();
    } catch (error) {
      console.error(`Failed to save ${type} token:`, error);
    }
  };

  const handleRemoveToken = async (type: string) => {
    try {
      switch (type) {
        case 'github':
          removeToken('github_token');
          break;
        case 'snyk':
          removeToken('snyk_token');
          break;
        case 'aws':
          removeToken('aws_access_key');
          removeToken('aws_secret_key');
          removeToken('aws_region');
          break;
      }
      await loadTokenStatus();
      await checkExpiringTokens();
    } catch (error) {
      console.error(`Failed to remove ${type} token:`, error);
    }
  };

  const handleClearAnalytics = () => {
    clearAnalytics();
    loadUsageStats();
  };

  const maskToken = (token: string, show: boolean) => {
    if (show || !token) return token;
    return token.length > 8 ? `${token.slice(0, 4)}${'*'.repeat(token.length - 8)}${token.slice(-4)}` : '*'.repeat(token.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Security Settings</h2>
      </div>

      {expiringTokens.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The following tokens are expiring soon and should be rotated: {expiringTokens.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="checklist" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checklist">Security Checklist</TabsTrigger>
          <TabsTrigger value="tokens">API Tokens</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Analytics</TabsTrigger>
          <TabsTrigger value="security">Security Options</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-4">
          <SecurityChecklist />
        </TabsContent>

        <TabsContent value="tokens" className="space-y-4">
          {/* GitHub Token */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  GitHub Personal Access Token
                </span>
                <Badge variant={tokenStatus.github ? "default" : "secondary"}>
                  {tokenStatus.github ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                  ) : (
                    "Not Set"
                  )}
                </Badge>
              </CardTitle>
              <CardDescription>
                Required for accessing private repositories and GitHub Actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-token">Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="github-token"
                    type={showTokens.github ? "text" : "password"}
                    value={maskToken(tokens.github, showTokens.github)}
                    onChange={(e) => setTokens(prev => ({ ...prev, github: e.target.value }))}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTokens(prev => ({ ...prev, github: !prev.github }))}
                  >
                    {showTokens.github ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleSaveToken('github')} disabled={!tokens.github}>
                  Save Token
                </Button>
                {tokenStatus.github && (
                  <Button variant="destructive" onClick={() => handleRemoveToken('github')}>
                    Remove Token
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Snyk Token */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Snyk API Token
                </span>
                <Badge variant={tokenStatus.snyk ? "default" : "secondary"}>
                  {tokenStatus.snyk ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                  ) : (
                    "Not Set"
                  )}
                </Badge>
              </CardTitle>
              <CardDescription>
                Required for Snyk vulnerability scanning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="snyk-token">Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="snyk-token"
                    type={showTokens.snyk ? "text" : "password"}
                    value={maskToken(tokens.snyk, showTokens.snyk)}
                    onChange={(e) => setTokens(prev => ({ ...prev, snyk: e.target.value }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTokens(prev => ({ ...prev, snyk: !prev.snyk }))}
                  >
                    {showTokens.snyk ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleSaveToken('snyk')} disabled={!tokens.snyk}>
                  Save Token
                </Button>
                {tokenStatus.snyk && (
                  <Button variant="destructive" onClick={() => handleRemoveToken('snyk')}>
                    Remove Token
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AWS Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  AWS Credentials
                </span>
                <Badge variant={tokenStatus.aws ? "default" : "secondary"}>
                  {tokenStatus.aws ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                  ) : (
                    "Not Set"
                  )}
                </Badge>
              </CardTitle>
              <CardDescription>
                Required for AWS ECR and ECS deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aws-access-key">Access Key ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="aws-access-key"
                      type={showTokens.awsAccessKey ? "text" : "password"}
                      value={maskToken(tokens.awsAccessKey, showTokens.awsAccessKey)}
                      onChange={(e) => setTokens(prev => ({ ...prev, awsAccessKey: e.target.value }))}
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTokens(prev => ({ ...prev, awsAccessKey: !prev.awsAccessKey }))}
                    >
                      {showTokens.awsAccessKey ? "Hide" : "Show"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws-secret-key">Secret Access Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="aws-secret-key"
                      type={showTokens.awsSecretKey ? "text" : "password"}
                      value={maskToken(tokens.awsSecretKey, showTokens.awsSecretKey)}
                      onChange={(e) => setTokens(prev => ({ ...prev, awsSecretKey: e.target.value }))}
                      placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTokens(prev => ({ ...prev, awsSecretKey: !prev.awsSecretKey }))}
                    >
                      {showTokens.awsSecretKey ? "Hide" : "Show"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aws-region">Default Region</Label>
                <Input
                  id="aws-region"
                  value={tokens.awsRegion}
                  onChange={(e) => setTokens(prev => ({ ...prev, awsRegion: e.target.value }))}
                  placeholder="us-east-1"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleSaveToken('aws')} 
                  disabled={!tokens.awsAccessKey || !tokens.awsSecretKey}
                >
                  Save Credentials
                </Button>
                {tokenStatus.aws && (
                  <Button variant="destructive" onClick={() => handleRemoveToken('aws')}>
                    Remove Credentials
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Privacy & Analytics
              </CardTitle>
              <CardDescription>
                Manage your privacy settings and view usage analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-analytics">Enable Privacy-Focused Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Collect anonymous usage data to improve the application
                  </p>
                </div>
                <Switch
                  id="enable-analytics"
                  checked={settings.enableAnalytics}
                  onCheckedChange={(checked: boolean) => 
                    setSettings(prev => ({ ...prev, enableAnalytics: checked }))
                  }
                />
              </div>

              {usageStats && (
                <div className="space-y-2">
                  <h4 className="font-medium">Usage Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{usageStats.totalEvents}</div>
                      <div className="text-sm text-muted-foreground">Total Events</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{usageStats.sessionsCount}</div>
                      <div className="text-sm text-muted-foreground">Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Object.keys(usageStats.eventTypes).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Event Types</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {usageStats.lastActivity ? new Date(usageStats.lastActivity).toLocaleDateString() : 'Never'}
                      </div>
                      <div className="text-sm text-muted-foreground">Last Activity</div>
                    </div>
                  </div>
                </div>
              )}

              <Button variant="destructive" onClick={handleClearAnalytics}>
                Clear All Analytics Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security Options
              </CardTitle>
              <CardDescription>
                Configure security features and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-rotate">Automatic Token Rotation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically prompt for token renewal before expiration
                  </p>
                </div>
                <Switch
                  id="auto-rotate"
                  checked={settings.autoRotateTokens}
                  onCheckedChange={(checked: boolean) => 
                    setSettings(prev => ({ ...prev, autoRotateTokens: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="secure-storage">Enhanced Secure Storage</Label>
                  <p className="text-sm text-muted-foreground">
                    Use client-side encryption for all sensitive data
                  </p>
                </div>
                <Switch
                  id="secure-storage"
                  checked={settings.secureStorage}
                  onCheckedChange={(checked: boolean) => 
                    setSettings(prev => ({ ...prev, secureStorage: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Token Expiration Status
                </h4>
                <div className="space-y-2">
                  {Object.entries(tokenStatus).map(([key, isActive]) => (
                    <div key={key} className="flex items-center justify-between p-2 border rounded">
                      <span className="capitalize">{key} Token</span>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Active" : "Not Set"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}