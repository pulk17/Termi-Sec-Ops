import { useState, useEffect, useCallback } from 'react';
import { 
  notificationService, 
  NotificationConfig, 
  NotificationPayload, 
  AlertRule 
} from '@/lib/notifications';
import { toast } from 'sonner';

export function useNotifications() {
  const [config, setConfig] = useState<NotificationConfig>(notificationService.getConfig());
  const [alertRules, setAlertRules] = useState<AlertRule[]>(notificationService.getAlertRules());
  const [notificationHistory, setNotificationHistory] = useState<NotificationPayload[]>(
    notificationService.getNotificationHistory()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<NotificationConfig>) => {
    notificationService.updateConfig(newConfig);
    setConfig(notificationService.getConfig());
    toast.success('Notification settings updated');
  }, []);

  // Alert rule management
  const addAlertRule = useCallback((rule: Omit<AlertRule, 'id'>) => {
    const id = notificationService.addAlertRule(rule);
    setAlertRules(notificationService.getAlertRules());
    toast.success('Alert rule added');
    return id;
  }, []);

  const updateAlertRule = useCallback((id: string, updates: Partial<AlertRule>) => {
    const success = notificationService.updateAlertRule(id, updates);
    if (success) {
      setAlertRules(notificationService.getAlertRules());
      toast.success('Alert rule updated');
    } else {
      toast.error('Failed to update alert rule');
    }
    return success;
  }, []);

  const deleteAlertRule = useCallback((id: string) => {
    const success = notificationService.deleteAlertRule(id);
    if (success) {
      setAlertRules(notificationService.getAlertRules());
      toast.success('Alert rule deleted');
    } else {
      toast.error('Failed to delete alert rule');
    }
    return success;
  }, []);

  const toggleAlertRule = useCallback((id: string) => {
    const rule = alertRules.find(r => r.id === id);
    if (rule) {
      updateAlertRule(id, { enabled: !rule.enabled });
    }
  }, [alertRules, updateAlertRule]);

  // Send notification
  const sendNotification = useCallback(async (payload: NotificationPayload) => {
    try {
      await notificationService.sendNotification(payload);
      setNotificationHistory(notificationService.getNotificationHistory());
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast.error('Failed to send notification');
    }
  }, []);

  // Test notifications
  const testNotification = useCallback(async (type: 'browser' | 'email' | 'webhook' = 'browser') => {
    setIsLoading(true);
    try {
      await notificationService.testNotification(type);
      toast.success(`Test ${type} notification sent`);
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error(`Failed to send test ${type} notification`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check alert rules for scan data
  const checkAlertRules = useCallback((scanData: {
    vulnerabilities: { critical: number; high: number; medium: number; low: number };
    securityScore: number;
    scanDuration: number;
    status: 'completed' | 'failed';
    repositoryName: string;
    scanId: string;
  }) => {
    notificationService.checkAlertRules(scanData);
    setNotificationHistory(notificationService.getNotificationHistory());
  }, []);

  // Clear notification history
  const clearHistory = useCallback(() => {
    notificationService.clearNotificationHistory();
    setNotificationHistory([]);
    toast.success('Notification history cleared');
  }, []);

  // Request browser notification permission
  const requestBrowserPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Browser notification permission granted');
      return true;
    } else {
      toast.error('Browser notification permission denied');
      return false;
    }
  }, []);

  // Get notification statistics
  const getStats = useCallback(() => {
    const total = notificationHistory.length;
    const bySeverity = notificationHistory.reduce((acc, notification) => {
      acc[notification.severity] = (acc[notification.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = notificationHistory.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recent = notificationHistory.filter(n => {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return n.timestamp >= dayAgo;
    }).length;

    return {
      total,
      recent,
      bySeverity,
      byType,
      enabledRules: alertRules.filter(r => r.enabled).length,
      totalRules: alertRules.length
    };
  }, [notificationHistory, alertRules]);

  // Refresh data
  const refresh = useCallback(() => {
    setConfig(notificationService.getConfig());
    setAlertRules(notificationService.getAlertRules());
    setNotificationHistory(notificationService.getNotificationHistory());
  }, []);

  return {
    // State
    config,
    alertRules,
    notificationHistory,
    isLoading,

    // Config management
    updateConfig,
    requestBrowserPermission,

    // Alert rule management
    addAlertRule,
    updateAlertRule,
    deleteAlertRule,
    toggleAlertRule,

    // Notification actions
    sendNotification,
    testNotification,
    checkAlertRules,

    // History management
    clearHistory,

    // Utilities
    getStats,
    refresh
  };
}

// Hook for sending specific notification types
export function useNotificationSender() {
  const { sendNotification } = useNotifications();

  const notifyScanComplete = useCallback((data: {
    repositoryName: string;
    scanId: string;
    vulnerabilities: { critical: number; high: number; medium: number; low: number };
    duration: number;
  }) => {
    const totalVulns = Object.values(data.vulnerabilities).reduce((a, b) => a + b, 0);
    const severity = data.vulnerabilities.critical > 0 ? 'critical' :
                    data.vulnerabilities.high > 0 ? 'error' :
                    totalVulns > 0 ? 'warning' : 'info';

    sendNotification({
      type: 'scan_complete',
      severity,
      title: 'Scan Completed',
      message: `Security scan completed for ${data.repositoryName}. Found ${totalVulns} vulnerabilities.`,
      timestamp: new Date(),
      repositoryName: data.repositoryName,
      scanId: data.scanId,
      data: data.vulnerabilities
    });
  }, [sendNotification]);

  const notifyScanFailed = useCallback((data: {
    repositoryName: string;
    scanId: string;
    error: string;
  }) => {
    sendNotification({
      type: 'scan_failed',
      severity: 'error',
      title: 'Scan Failed',
      message: `Security scan failed for ${data.repositoryName}: ${data.error}`,
      timestamp: new Date(),
      repositoryName: data.repositoryName,
      scanId: data.scanId,
      data: { error: data.error }
    });
  }, [sendNotification]);

  const notifyVulnerabilityFound = useCallback((data: {
    repositoryName: string;
    scanId: string;
    vulnerability: {
      id: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      package: string;
    };
  }) => {
    const severity = data.vulnerability.severity === 'critical' ? 'critical' :
                    data.vulnerability.severity === 'high' ? 'error' : 'warning';

    sendNotification({
      type: 'vulnerability_found',
      severity,
      title: `${data.vulnerability.severity.toUpperCase()} Vulnerability Found`,
      message: `${data.vulnerability.title} in ${data.vulnerability.package}`,
      timestamp: new Date(),
      repositoryName: data.repositoryName,
      scanId: data.scanId,
      data: data.vulnerability
    });
  }, [sendNotification]);

  return {
    notifyScanComplete,
    notifyScanFailed,
    notifyVulnerabilityFound
  };
}