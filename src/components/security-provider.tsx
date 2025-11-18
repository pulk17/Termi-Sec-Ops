'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TokenManager } from '@/lib/encryption';
import { privacyAnalytics } from '@/lib/privacy-analytics';

interface SecurityContextType {
  isInitialized: boolean;
  storeSecureToken: (name: string, token: string, expiresIn?: number) => Promise<void>;
  getSecureToken: (name: string) => Promise<string | null>;
  removeSecureToken: (name: string) => Promise<void>;
  clearAllTokens: () => Promise<void>;
  trackEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  getUsageStats: () => unknown;
  clearAnalytics: () => void;
  isTokenExpiringSoon: (name: string, thresholdMs?: number) => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize security components
        setIsInitialized(true);
        console.log('Security components initialized');
      } catch (error) {
        console.error('Security initialization failed:', error);
      }
    };

    initialize();
  }, []);

  const contextValue: SecurityContextType = {
    isInitialized,
    storeSecureToken: TokenManager.storeToken.bind(TokenManager),
    getSecureToken: TokenManager.getToken.bind(TokenManager),
    removeSecureToken: async (name: string) => TokenManager.removeToken(name),
    clearAllTokens: async () => TokenManager.clearAllTokens(),
    trackEvent: (eventName: string, properties?: Record<string, unknown>) => {
      privacyAnalytics.track(eventName, 'security', properties);
    },
    getUsageStats: privacyAnalytics.getAnalyticsSummary.bind(privacyAnalytics),
    clearAnalytics: privacyAnalytics.clearData.bind(privacyAnalytics),
    isTokenExpiringSoon: async (name: string, thresholdMs = 24 * 60 * 60 * 1000) => {
      const tokenInfo = await TokenManager.getTokenInfo(name);
      return tokenInfo ? Date.now() + thresholdMs > tokenInfo.expiresAt : false;
    },
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

// Hook for secure token management
export function useSecureTokens() {
  const { storeSecureToken, getSecureToken, removeSecureToken, isTokenExpiringSoon } = useSecurity();

  const storeGitHubToken = async (token: string) => {
    await storeSecureToken('github_token', token);
  };

  const getGitHubToken = async () => {
    return await getSecureToken('github_token');
  };

  const storeSnykToken = async (token: string) => {
    await storeSecureToken('snyk_token', token);
  };

  const getSnykToken = async () => {
    return await getSecureToken('snyk_token');
  };

  const storeAWSCredentials = async (accessKey: string, secretKey: string, region?: string) => {
    await storeSecureToken('aws_access_key', accessKey);
    await storeSecureToken('aws_secret_key', secretKey);
    if (region) {
      await storeSecureToken('aws_region', region);
    }
  };

  const getAWSCredentials = async () => {
    const [accessKey, secretKey, region] = await Promise.all([
      getSecureToken('aws_access_key'),
      getSecureToken('aws_secret_key'),
      getSecureToken('aws_region'),
    ]);

    return { accessKey, secretKey, region };
  };

  const checkTokenRotation = async () => {
    const tokens = ['github_token', 'snyk_token', 'aws_access_key', 'aws_secret_key'];
    const expiringTokens = [];

    for (const token of tokens) {
      if (await isTokenExpiringSoon(token)) {
        expiringTokens.push(token);
      }
    }

    return expiringTokens;
  };

  return {
    storeGitHubToken,
    getGitHubToken,
    storeSnykToken,
    getSnykToken,
    storeAWSCredentials,
    getAWSCredentials,
    checkTokenRotation,
    removeToken: removeSecureToken,
  };
}

// Hook for privacy-focused analytics
export function usePrivacyAnalytics() {
  const { trackEvent, getUsageStats, clearAnalytics } = useSecurity();

  const trackScanStarted = (projectType: string, scanTypes: string[]) => {
    trackEvent('scan_started', {
      project_type: projectType,
      scan_types: scanTypes.join(','),
      scan_count: scanTypes.length,
    });
  };

  const trackScanCompleted = (duration: number, vulnerabilityCount: number) => {
    trackEvent('scan_completed', {
      duration_ms: duration,
      vulnerability_count: vulnerabilityCount,
      success: true,
    });
  };

  const trackScanFailed = (error: string, stage: string) => {
    trackEvent('scan_failed', {
      error_type: error,
      failure_stage: stage,
      success: false,
    });
  };

  const trackFeatureUsed = (feature: string, context?: string) => {
    trackEvent('feature_used', {
      feature_name: feature,
      context: context || 'unknown',
    });
  };

  const trackPerformanceMetric = (metric: string, value: number, unit: string) => {
    trackEvent('performance_metric', {
      metric_name: metric,
      value,
      unit,
    });
  };

  return {
    trackScanStarted,
    trackScanCompleted,
    trackScanFailed,
    trackFeatureUsed,
    trackPerformanceMetric,
    getUsageStats,
    clearAnalytics,
  };
}