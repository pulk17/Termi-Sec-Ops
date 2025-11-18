import { toast } from 'sonner';

export interface NotificationConfig {
  browserNotifications: boolean;
  emailNotifications: boolean;
  webhookNotifications: boolean;
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  emailAddress?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface NotificationPayload {
  type: 'scan_complete' | 'scan_failed' | 'vulnerability_found' | 'threshold_exceeded';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  repositoryName?: string;
  scanId?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    vulnerabilityCount?: {
      critical?: number;
      high?: number;
      medium?: number;
      low?: number;
    };
    securityScoreThreshold?: number;
    scanDurationThreshold?: number; // in minutes
    failureCount?: number;
  };
  actions: {
    browserNotification: boolean;
    emailNotification: boolean;
    webhookNotification: boolean;
  };
  cooldownPeriod: number; // in minutes
  lastTriggered?: Date;
}

class NotificationService {
  private config: NotificationConfig;
  private alertRules: AlertRule[] = [];
  private notificationHistory: NotificationPayload[] = [];

  constructor() {
    this.config = this.loadConfig();
    this.initializeBrowserNotifications();
    this.loadAlertRules();
  }

  private loadConfig(): NotificationConfig {
    const saved = localStorage.getItem('notification-config');
    if (saved) {
      return JSON.parse(saved);
    }
    
    return {
      browserNotifications: true,
      emailNotifications: false,
      webhookNotifications: false,
      severityThreshold: 'medium'
    };
  }

  private saveConfig(): void {
    localStorage.setItem('notification-config', JSON.stringify(this.config));
  }

  private loadAlertRules(): void {
    const saved = localStorage.getItem('alert-rules');
    if (saved) {
      this.alertRules = JSON.parse(saved);
    } else {
      // Default alert rules
      this.alertRules = [
        {
          id: 'critical-vulnerabilities',
          name: 'Critical Vulnerabilities Found',
          description: 'Alert when critical vulnerabilities are detected',
          enabled: true,
          conditions: {
            vulnerabilityCount: { critical: 1 }
          },
          actions: {
            browserNotification: true,
            emailNotification: true,
            webhookNotification: false
          },
          cooldownPeriod: 60
        },
        {
          id: 'high-vulnerability-count',
          name: 'High Vulnerability Count',
          description: 'Alert when high vulnerability count exceeds threshold',
          enabled: true,
          conditions: {
            vulnerabilityCount: { high: 10 }
          },
          actions: {
            browserNotification: true,
            emailNotification: false,
            webhookNotification: false
          },
          cooldownPeriod: 30
        },
        {
          id: 'low-security-score',
          name: 'Low Security Score',
          description: 'Alert when security score falls below threshold',
          enabled: true,
          conditions: {
            securityScoreThreshold: 30
          },
          actions: {
            browserNotification: true,
            emailNotification: true,
            webhookNotification: false
          },
          cooldownPeriod: 120
        },
        {
          id: 'scan-failure',
          name: 'Scan Failures',
          description: 'Alert when multiple scans fail consecutively',
          enabled: true,
          conditions: {
            failureCount: 3
          },
          actions: {
            browserNotification: true,
            emailNotification: true,
            webhookNotification: true
          },
          cooldownPeriod: 60
        }
      ];
      this.saveAlertRules();
    }
  }

  private saveAlertRules(): void {
    localStorage.setItem('alert-rules', JSON.stringify(this.alertRules));
  }

  private async initializeBrowserNotifications(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Browser notification permission denied');
      }
    }
  }

  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRule: AlertRule = { ...rule, id };
    this.alertRules.push(newRule);
    this.saveAlertRules();
    return id;
  }

  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === id);
    if (index === -1) return false;

    this.alertRules[index] = { ...this.alertRules[index], ...updates };
    this.saveAlertRules();
    return true;
  }

  deleteAlertRule(id: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === id);
    if (index === -1) return false;

    this.alertRules.splice(index, 1);
    this.saveAlertRules();
    return true;
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    // Add to history
    this.notificationHistory.unshift(payload);
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100);
    }

    // Check severity threshold
    const severityLevels = ['info', 'warning', 'error', 'critical'];
    const payloadLevel = severityLevels.indexOf(payload.severity);
    const thresholdLevel = severityLevels.indexOf(this.config.severityThreshold);
    
    if (payloadLevel < thresholdLevel) {
      return; // Below threshold, don't send
    }

    // Send browser notification
    if (this.config.browserNotifications) {
      await this.sendBrowserNotification(payload);
    }

    // Send email notification
    if (this.config.emailNotifications && this.config.emailAddress) {
      await this.sendEmailNotification(payload);
    }

    // Send webhook notification
    if (this.config.webhookNotifications && this.config.webhookUrl) {
      await this.sendWebhookNotification(payload);
    }

    // Show toast notification
    this.showToastNotification(payload);
  }

  private async sendBrowserNotification(payload: NotificationPayload): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const icon = this.getSeverityIcon(payload.severity);
    const notification = new Notification(payload.title, {
      body: payload.message,
      icon,
      badge: icon,
      tag: payload.scanId || payload.type,
      requireInteraction: payload.severity === 'critical'
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Navigate to relevant page if scan ID is provided
      if (payload.scanId) {
        window.location.href = `/scan/${payload.scanId}`;
      }
    };

    // Auto-close after 10 seconds for non-critical notifications
    if (payload.severity !== 'critical') {
      setTimeout(() => notification.close(), 10000);
    }
  }

  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    if (!this.config.emailAddress) return;

    try {
      // Using EmailJS or similar service for client-side email sending
      // This is a simplified implementation - in production, use a proper email service
      const emailData = {
        to_email: this.config.emailAddress,
        subject: `Security Alert: ${payload.title}`,
        message: this.formatEmailMessage(payload),
        severity: payload.severity,
        timestamp: payload.timestamp.toISOString()
      };

      // Simulate email sending (replace with actual EmailJS or API call)
      console.log('Sending email notification:', emailData);
      
      // Example EmailJS integration:
      // await emailjs.send('service_id', 'template_id', emailData, 'public_key');
      
      toast.success('Email notification sent');
    } catch (error) {
      console.error('Failed to send email notification:', error);
      toast.error('Failed to send email notification');
    }
  }

  private async sendWebhookNotification(payload: NotificationPayload): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      const webhookPayload = {
        ...payload,
        timestamp: payload.timestamp.toISOString(),
        source: 'devsecops-pipeline'
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add webhook signature if secret is configured
      if (this.config.webhookSecret) {
        const signature = await this.generateWebhookSignature(
          JSON.stringify(webhookPayload),
          this.config.webhookSecret
        );
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      toast.success('Webhook notification sent');
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
      toast.error('Failed to send webhook notification');
    }
  }

  private showToastNotification(payload: NotificationPayload): void {
    const options = {
      description: payload.message,
      duration: payload.severity === 'critical' ? 0 : 5000, // Critical notifications don't auto-dismiss
    };

    switch (payload.severity) {
      case 'critical':
        toast.error(payload.title, options);
        break;
      case 'error':
        toast.error(payload.title, options);
        break;
      case 'warning':
        toast.warning(payload.title, options);
        break;
      case 'info':
      default:
        toast.success(payload.title, options);
        break;
    }
  }

  private formatEmailMessage(payload: NotificationPayload): string {
    let message = `${payload.message}\n\n`;
    
    if (payload.repositoryName) {
      message += `Repository: ${payload.repositoryName}\n`;
    }
    
    if (payload.scanId) {
      message += `Scan ID: ${payload.scanId}\n`;
    }
    
    message += `Timestamp: ${payload.timestamp.toLocaleString()}\n`;
    message += `Severity: ${payload.severity.toUpperCase()}\n`;
    
    if (payload.data) {
      message += `\nAdditional Data:\n${JSON.stringify(payload.data, null, 2)}`;
    }
    
    return message;
  }

  private async generateWebhookSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `sha256=${hashHex}`;
  }

  private getSeverityIcon(severity: string): string {
    const baseUrl = '/icons'; // Adjust based on your icon location
    switch (severity) {
      case 'critical':
        return `${baseUrl}/critical.png`;
      case 'error':
        return `${baseUrl}/error.png`;
      case 'warning':
        return `${baseUrl}/warning.png`;
      case 'info':
      default:
        return `${baseUrl}/info.png`;
    }
  }

  checkAlertRules(scanData: {
    vulnerabilities: { critical: number; high: number; medium: number; low: number };
    securityScore: number;
    scanDuration: number;
    status: 'completed' | 'failed';
    repositoryName: string;
    scanId: string;
  }): void {
    const now = new Date();

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown period
      if (rule.lastTriggered) {
        const timeSinceLastTrigger = now.getTime() - rule.lastTriggered.getTime();
        const cooldownMs = rule.cooldownPeriod * 60 * 1000;
        if (timeSinceLastTrigger < cooldownMs) {
          continue;
        }
      }

      let shouldTrigger = false;
      let alertMessage = '';

      // Check vulnerability count conditions
      if (rule.conditions.vulnerabilityCount) {
        const conditions = rule.conditions.vulnerabilityCount;
        if (conditions.critical && scanData.vulnerabilities.critical >= conditions.critical) {
          shouldTrigger = true;
          alertMessage = `Found ${scanData.vulnerabilities.critical} critical vulnerabilities`;
        } else if (conditions.high && scanData.vulnerabilities.high >= conditions.high) {
          shouldTrigger = true;
          alertMessage = `Found ${scanData.vulnerabilities.high} high severity vulnerabilities`;
        } else if (conditions.medium && scanData.vulnerabilities.medium >= conditions.medium) {
          shouldTrigger = true;
          alertMessage = `Found ${scanData.vulnerabilities.medium} medium severity vulnerabilities`;
        } else if (conditions.low && scanData.vulnerabilities.low >= conditions.low) {
          shouldTrigger = true;
          alertMessage = `Found ${scanData.vulnerabilities.low} low severity vulnerabilities`;
        }
      }

      // Check security score threshold
      if (rule.conditions.securityScoreThreshold && 
          scanData.securityScore < rule.conditions.securityScoreThreshold) {
        shouldTrigger = true;
        alertMessage = `Security score (${scanData.securityScore}) below threshold (${rule.conditions.securityScoreThreshold})`;
      }

      // Check scan duration threshold
      if (rule.conditions.scanDurationThreshold && 
          scanData.scanDuration > rule.conditions.scanDurationThreshold * 60) {
        shouldTrigger = true;
        alertMessage = `Scan duration (${Math.round(scanData.scanDuration / 60)}m) exceeded threshold (${rule.conditions.scanDurationThreshold}m)`;
      }

      if (shouldTrigger) {
        // Update last triggered time
        rule.lastTriggered = now;
        this.saveAlertRules();

        // Send notification
        const payload: NotificationPayload = {
          type: 'threshold_exceeded',
          severity: this.getSeverityFromRule(rule),
          title: rule.name,
          message: alertMessage,
          timestamp: now,
          repositoryName: scanData.repositoryName,
          scanId: scanData.scanId,
          data: { rule: rule.name, conditions: rule.conditions }
        };

        this.sendNotification(payload);
      }
    }
  }

  private getSeverityFromRule(rule: AlertRule): 'info' | 'warning' | 'error' | 'critical' {
    if (rule.conditions.vulnerabilityCount?.critical) return 'critical';
    if (rule.conditions.vulnerabilityCount?.high) return 'error';
    if (rule.conditions.securityScoreThreshold && rule.conditions.securityScoreThreshold < 50) return 'error';
    if (rule.conditions.failureCount) return 'error';
    return 'warning';
  }

  getNotificationHistory(): NotificationPayload[] {
    return [...this.notificationHistory];
  }

  clearNotificationHistory(): void {
    this.notificationHistory = [];
  }

  // Test notification functionality
  async testNotification(type: 'browser' | 'email' | 'webhook' = 'browser'): Promise<void> {
    const testPayload: NotificationPayload = {
      type: 'scan_complete',
      severity: 'info',
      title: 'Test Notification',
      message: 'This is a test notification to verify your notification settings.',
      timestamp: new Date(),
      repositoryName: 'test-repo',
      scanId: 'test-scan-123'
    };

    switch (type) {
      case 'browser':
        await this.sendBrowserNotification(testPayload);
        break;
      case 'email':
        await this.sendEmailNotification(testPayload);
        break;
      case 'webhook':
        await this.sendWebhookNotification(testPayload);
        break;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();