'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bell, 
  Mail, 
  Webhook, 
  Plus, 
  Trash2, 
  Edit, 
  TestTube,
  Shield,
  AlertTriangle,
  Clock,
  Settings,
  History,
  BarChart3
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { AlertRule } from '@/lib/notifications';

export function NotificationSettings() {
  const {
    config,
    alertRules,
    notificationHistory,
    isLoading,
    updateConfig,
    addAlertRule,
    updateAlertRule,
    deleteAlertRule,
    toggleAlertRule,
    testNotification,
    clearHistory,
    requestBrowserPermission,
    getStats
  } = useNotifications();

  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: '',
    description: '',
    enabled: true,
    conditions: {},
    actions: {
      browserNotification: true,
      emailNotification: false,
      webhookNotification: false
    },
    cooldownPeriod: 60
  });

  const stats = getStats();

  const handleConfigUpdate = (key: string, value: any) => {
    updateConfig({ [key]: value });
  };

  const handleAddRule = () => {
    if (!newRule.name || !newRule.description) return;

    addAlertRule(newRule as Omit<AlertRule, 'id'>);
    setNewRule({
      name: '',
      description: '',
      enabled: true,
      conditions: {},
      actions: {
        browserNotification: true,
        emailNotification: false,
        webhookNotification: false
      },
      cooldownPeriod: 60
    });
    setIsAddingRule(false);
  };

  const handleTestNotification = async (type: 'browser' | 'email' | 'webhook') => {
    await testNotification(type);
  };

  const severityOptions = [
    { value: 'low', label: 'Low and above' },
    { value: 'medium', label: 'Medium and above' },
    { value: 'high', label: 'High and above' },
    { value: 'critical', label: 'Critical only' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notification Settings</h2>
        <p className="text-muted-foreground">
          Configure how and when you receive security alerts
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          {/* Browser Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Browser Notifications
              </CardTitle>
              <CardDescription>
                Receive notifications directly in your browser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable browser notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications in your browser when scans complete or issues are found
                  </p>
                </div>
                <Checkbox
                  checked={config.browserNotifications}
                  onCheckedChange={(checked) => handleConfigUpdate('browserNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestBrowserPermission}
                >
                  Request Permission
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestNotification('browser')}
                  disabled={isLoading}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Receive notifications via email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email alerts for security issues
                  </p>
                </div>
                <Checkbox
                  checked={config.emailNotifications}
                  onCheckedChange={(checked) => handleConfigUpdate('emailNotifications', checked)}
                />
              </div>
              
              {config.emailNotifications && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={config.emailAddress || ''}
                    onChange={(e) => handleConfigUpdate('emailAddress', e.target.value)}
                  />
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestNotification('email')}
                disabled={isLoading || !config.emailNotifications || !config.emailAddress}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Email
              </Button>
            </CardContent>
          </Card>

          {/* Webhook Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Notifications
              </CardTitle>
              <CardDescription>
                Send notifications to external systems via webhooks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable webhook notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send HTTP POST requests to external endpoints
                  </p>
                </div>
                <Checkbox
                  checked={config.webhookNotifications}
                  onCheckedChange={(checked) => handleConfigUpdate('webhookNotifications', checked)}
                />
              </div>
              
              {config.webhookNotifications && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      placeholder="https://your-webhook-endpoint.com/notifications"
                      value={config.webhookUrl || ''}
                      onChange={(e) => handleConfigUpdate('webhookUrl', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="webhook-secret">Webhook Secret (Optional)</Label>
                    <Input
                      id="webhook-secret"
                      type="password"
                      placeholder="Secret for HMAC signature verification"
                      value={config.webhookSecret || ''}
                      onChange={(e) => handleConfigUpdate('webhookSecret', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to generate HMAC-SHA256 signature in X-Webhook-Signature header
                    </p>
                  </div>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestNotification('webhook')}
                disabled={isLoading || !config.webhookNotifications || !config.webhookUrl}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Webhook
              </Button>
            </CardContent>
          </Card>

          {/* Severity Threshold */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Severity Threshold
              </CardTitle>
              <CardDescription>
                Set the minimum severity level for notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Minimum severity level</Label>
                <select
                  value={config.severityThreshold}
                  onChange={(e) => handleConfigUpdate('severityThreshold', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {severityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  Only notifications at or above this severity level will be sent
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Alert Rules</h3>
              <p className="text-sm text-muted-foreground">
                Configure custom rules for when to send notifications
              </p>
            </div>
            <Button onClick={() => setIsAddingRule(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          {/* Add/Edit Rule Form */}
          {(isAddingRule || editingRule) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {isAddingRule ? 'Add New Alert Rule' : 'Edit Alert Rule'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input
                      id="rule-name"
                      placeholder="e.g., Critical Vulnerabilities"
                      value={newRule.name || ''}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cooldown">Cooldown Period (minutes)</Label>
                    <Input
                      id="cooldown"
                      type="number"
                      min="1"
                      value={newRule.cooldownPeriod || 60}
                      onChange={(e) => setNewRule({ ...newRule, cooldownPeriod: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rule-description">Description</Label>
                  <Input
                    id="rule-description"
                    placeholder="Describe when this rule should trigger"
                    value={newRule.description || ''}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  />
                </div>

                {/* Conditions */}
                <div className="space-y-4">
                  <h4 className="font-medium">Conditions</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Critical Vulnerabilities</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newRule.conditions?.vulnerabilityCount?.critical || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          conditions: {
                            ...newRule.conditions,
                            vulnerabilityCount: {
                              ...newRule.conditions?.vulnerabilityCount,
                              critical: parseInt(e.target.value) || undefined
                            }
                          }
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>High Vulnerabilities</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newRule.conditions?.vulnerabilityCount?.high || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          conditions: {
                            ...newRule.conditions,
                            vulnerabilityCount: {
                              ...newRule.conditions?.vulnerabilityCount,
                              high: parseInt(e.target.value) || undefined
                            }
                          }
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Security Score Below</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="50"
                        value={newRule.conditions?.securityScoreThreshold || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          conditions: {
                            ...newRule.conditions,
                            securityScoreThreshold: parseInt(e.target.value) || undefined
                          }
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Scan Duration (min)</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="30"
                        value={newRule.conditions?.scanDurationThreshold || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          conditions: {
                            ...newRule.conditions,
                            scanDurationThreshold: parseInt(e.target.value) || undefined
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <h4 className="font-medium">Actions</h4>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="browser-action"
                        checked={newRule.actions?.browserNotification}
                        onCheckedChange={(checked) => setNewRule({
                          ...newRule,
                          actions: { ...newRule.actions!, browserNotification: !!checked }
                        })}
                      />
                      <Label htmlFor="browser-action">Browser Notification</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="email-action"
                        checked={newRule.actions?.emailNotification}
                        onCheckedChange={(checked) => setNewRule({
                          ...newRule,
                          actions: { ...newRule.actions!, emailNotification: !!checked }
                        })}
                      />
                      <Label htmlFor="email-action">Email Notification</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="webhook-action"
                        checked={newRule.actions?.webhookNotification}
                        onCheckedChange={(checked) => setNewRule({
                          ...newRule,
                          actions: { ...newRule.actions!, webhookNotification: !!checked }
                        })}
                      />
                      <Label htmlFor="webhook-action">Webhook Notification</Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddRule}>
                    {isAddingRule ? 'Add Rule' : 'Update Rule'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingRule(false);
                      setEditingRule(null);
                      setNewRule({
                        name: '',
                        description: '',
                        enabled: true,
                        conditions: {},
                        actions: {
                          browserNotification: true,
                          emailNotification: false,
                          webhookNotification: false
                        },
                        cooldownPeriod: 60
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Rules */}
          <div className="space-y-4">
            {alertRules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {rule.lastTriggered && (
                          <Badge variant="outline" className="text-xs">
                            Last triggered: {rule.lastTriggered.toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {rule.cooldownPeriod}m cooldown
                        </span>
                        {rule.conditions.vulnerabilityCount?.critical && (
                          <span>Critical ≥ {rule.conditions.vulnerabilityCount.critical}</span>
                        )}
                        {rule.conditions.vulnerabilityCount?.high && (
                          <span>High ≥ {rule.conditions.vulnerabilityCount.high}</span>
                        )}
                        {rule.conditions.securityScoreThreshold && (
                          <span>Score &lt; {rule.conditions.securityScoreThreshold}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAlertRule(rule.id)}
                      >
                        {rule.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule.id);
                          setNewRule(rule);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAlertRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Notification History</h3>
              <p className="text-sm text-muted-foreground">
                Recent notifications sent by the system
              </p>
            </div>
            <Button variant="outline" onClick={clearHistory}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>

          <div className="space-y-2">
            {notificationHistory.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2" />
                    <p>No notifications sent yet</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              notificationHistory.slice(0, 50).map((notification, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={
                            notification.severity === 'critical' ? 'destructive' :
                            notification.severity === 'error' ? 'destructive' :
                            notification.severity === 'warning' ? 'secondary' : 'default'
                          }>
                            {notification.severity}
                          </Badge>
                          <span className="font-medium">{notification.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{notification.timestamp.toLocaleString()}</span>
                          {notification.repositoryName && (
                            <span>Repository: {notification.repositoryName}</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {notification.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Notifications</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.recent}</div>
                <p className="text-xs text-muted-foreground">Last 24 Hours</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.enabledRules}</div>
                <p className="text-xs text-muted-foreground">Active Rules</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalRules}</div>
                <p className="text-xs text-muted-foreground">Total Rules</p>
              </CardContent>
            </Card>
          </div>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.bySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        severity === 'critical' ? 'destructive' :
                        severity === 'error' ? 'destructive' :
                        severity === 'warning' ? 'secondary' : 'default'
                      }>
                        {severity}
                      </Badge>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}