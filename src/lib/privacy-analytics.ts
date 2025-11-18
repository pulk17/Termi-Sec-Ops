// Privacy-focused analytics without user tracking

export interface AnalyticsEvent {
  event: string;
  category: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
}

export interface AnalyticsConfig {
  enableLocalStorage: boolean;
  maxEventsStored: number;
  sessionTimeoutMs: number;
  enableConsoleLogging: boolean;
}

class PrivacyAnalytics {
  private config: AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private sessionStartTime: number;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enableLocalStorage: true,
      maxEventsStored: 1000,
      sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
      enableConsoleLogging: false,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      this.loadEventsFromStorage();
    }

    // Track page load
    if (typeof window !== 'undefined') {
      this.track('page_load', 'navigation', {
        url: window.location.pathname,
        referrer: document.referrer || 'direct'
      });
    }
  }

  /**
   * Track an analytics event
   */
  track(event: string, category: string, properties?: Record<string, unknown>): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      category,
      properties: this.sanitizeProperties(properties),
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.events.push(analyticsEvent);

    // Maintain max events limit
    if (this.events.length > this.config.maxEventsStored) {
      this.events = this.events.slice(-this.config.maxEventsStored);
    }

    if (this.config.enableConsoleLogging) {
      console.log('Analytics Event:', analyticsEvent);
    }

    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      this.saveEventsToStorage();
    }
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, action: string, properties?: Record<string, unknown>): void {
    this.track(`feature_${action}`, 'feature_usage', {
      feature,
      action,
      ...properties
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.track('performance_metric', 'performance', {
      metric,
      value,
      unit,
      sessionDuration: Date.now() - this.sessionStartTime
    });
  }

  /**
   * Track errors (without sensitive information)
   */
  trackError(error: string, category: string = 'javascript', properties?: Record<string, unknown>): void {
    this.track('error', 'error', {
      error: this.sanitizeError(error),
      category,
      ...properties
    });
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(): {
    totalEvents: number;
    sessionDuration: number;
    topEvents: Array<{ event: string; count: number }>;
    topCategories: Array<{ category: string; count: number }>;
  } {
    const eventCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    for (const event of this.events) {
      eventCounts.set(event.event, (eventCounts.get(event.event) || 0) + 1);
      categoryCounts.set(event.category, (categoryCounts.get(event.category) || 0) + 1);
    }

    const topEvents = Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: this.events.length,
      sessionDuration: Date.now() - this.sessionStartTime,
      topEvents,
      topCategories
    };
  }

  /**
   * Export analytics data (for user download)
   */
  exportData(): string {
    const exportData = {
      sessionId: this.sessionId,
      sessionStartTime: this.sessionStartTime,
      events: this.events,
      summary: this.getAnalyticsSummary()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear all analytics data
   */
  clearData(): void {
    this.events = [];
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      localStorage.removeItem('privacy_analytics');
    }
    // Analytics data cleared
  }

  /**
   * Get events by category
   */
  getEventsByCategory(category: string): AnalyticsEvent[] {
    return this.events.filter(event => event.category === category);
  }

  /**
   * Get events by time range
   */
  getEventsByTimeRange(startTime: number, endTime: number): AnalyticsEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    sessionId: string;
    duration: number;
    eventCount: number;
    startTime: number;
    isActive: boolean;
  } {
    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.sessionStartTime,
      eventCount: this.events.length,
      startTime: this.sessionStartTime,
      isActive: Date.now() - this.sessionStartTime < this.config.sessionTimeoutMs
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeProperties(properties?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!properties) return undefined;

    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      // Remove potentially sensitive data
      if (this.isSensitiveKey(key)) {
        continue;
      }

      // Sanitize values
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value && typeof value === 'object') {
        // For objects, only include safe properties
        sanitized[key] = '[object]';
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  private sanitizeError(error: string): string {
    // Remove file paths, URLs, and other potentially sensitive information
    return error
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      .replace(/\/[^\s]*\.(js|ts|jsx|tsx)/g, '[FILE]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  }

  private sanitizeString(str: string): string {
    // Remove potentially sensitive patterns
    return str
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'email', 'phone', 'ssn', 'credit', 'card', 'account',
      'personal', 'private', 'confidential'
    ];

    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }

  private saveEventsToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const data = {
        sessionId: this.sessionId,
        sessionStartTime: this.sessionStartTime,
        events: this.events.slice(-this.config.maxEventsStored) // Only keep recent events
      };
      localStorage.setItem('privacy_analytics', JSON.stringify(data));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Clear old data and try again with fewer events
        this.events = this.events.slice(-Math.floor(this.config.maxEventsStored / 2));
        try {
          const reducedData = {
            sessionId: this.sessionId,
            sessionStartTime: this.sessionStartTime,
            events: this.events
          };
          localStorage.setItem('privacy_analytics', JSON.stringify(reducedData));
        } catch {
          console.warn('Unable to save analytics - localStorage quota exceeded');
        }
      } else {
        console.error('Failed to save analytics to storage:', error);
      }
    }
  }

  private loadEventsFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('privacy_analytics');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Check if session is still valid
        if (Date.now() - data.sessionStartTime < this.config.sessionTimeoutMs) {
          this.sessionId = data.sessionId;
          this.sessionStartTime = data.sessionStartTime;
          this.events = data.events || [];
        }
      }
    } catch (error) {
      console.error('Failed to load analytics from storage:', error);
    }
  }
}

export const privacyAnalytics = new PrivacyAnalytics();