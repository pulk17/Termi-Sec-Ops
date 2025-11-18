/**
 * Centralized security configuration for the DevSecOps Pipeline application
 * This file contains all security-related constants and configurations
 */

// Encryption Configuration
export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'AES-GCM' as const,
  KEY_LENGTH: 256,
  IV_LENGTH: 12,
  TOKEN_ROTATION_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  TOKEN_EXPIRY_WARNING_THRESHOLD: 60 * 60 * 1000, // 1 hour
} as const;

// Content Security Policy Configuration
export const CSP_CONFIG = {
  DEFAULT_SRC: ["'self'"],
  SCRIPT_SRC: [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for development
    "https://cdn.jsdelivr.net",
  ],
  STYLE_SRC: [
    "'self'",
    "'unsafe-inline'", // Required for styled-components and CSS-in-JS
    "https://fonts.googleapis.com",
  ],
  FONT_SRC: [
    "'self'",
    "https://fonts.gstatic.com",
  ],
  IMG_SRC: [
    "'self'",
    "data:",
    "https:",
  ],
  CONNECT_SRC: [
    "'self'",
    "https://api.github.com",
    "https://api.snyk.io",
    "https://osv-vulnerabilities.storage.googleapis.com",
    "https://registry.npmjs.org",
    "https://search.maven.org",
    "https://pypi.org",
    "wss:",
  ],
  FRAME_ANCESTORS: ["'none'"],
  BASE_URI: ["'self'"],
  FORM_ACTION: ["'self'"],
  UPGRADE_INSECURE_REQUESTS: true,
} as const;

// Security Headers Configuration
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
} as const;

// Privacy Analytics Configuration
export const PRIVACY_CONFIG = {
  MAX_EVENTS: 1000,
  SESSION_STORAGE_KEY: 'session_id',
  ANALYTICS_STORAGE_KEY: 'privacy_analytics',
  SENSITIVE_KEYS: [
    'token', 'password', 'secret', 'key', 'auth', 'credential',
    'email', 'username', 'user', 'name', 'id', 'uuid'
  ],
  SANITIZATION_PATTERNS: {
    URL: /https?:\/\/[^\s]+/g,
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    UUID: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    IP: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  },
  REPLACEMENT_VALUES: {
    URL: '[URL]',
    EMAIL: '[EMAIL]',
    UUID: '[UUID]',
    IP: '[IP]',
  },
} as const;

// Token Management Configuration
export const TOKEN_CONFIG = {
  STORAGE_KEY: 'secure_tokens',
  ENCRYPTION_KEY_STORAGE: 'encryption_key',
  SUPPORTED_TOKENS: {
    GITHUB: 'github_token',
    SNYK: 'snyk_token',
    AWS_ACCESS_KEY: 'aws_access_key',
    AWS_SECRET_KEY: 'aws_secret_key',
    AWS_REGION: 'aws_region',
  },
  VALIDATION_PATTERNS: {
    GITHUB_TOKEN: /^gh[ps]_[A-Za-z0-9_]{36,251}$/,
    SNYK_TOKEN: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    AWS_ACCESS_KEY: /^AKIA[0-9A-Z]{16}$/,
    AWS_SECRET_KEY: /^[A-Za-z0-9/+=]{40}$/,
  },
} as const;

// Security Audit Configuration
export const AUDIT_CONFIG = {
  CHECKS: {
    HTTPS: 'https',
    SECURE_STORAGE: 'secure_storage',
    TOKEN_EXPIRATION: 'token_expiration',
    CSP: 'csp',
    SECURE_CONTEXT: 'secure_context',
    ENCRYPTED_TOKENS: 'encrypted_tokens',
    SESSION_MANAGEMENT: 'session_management',
    PRIVACY_ANALYTICS: 'privacy_analytics',
    CORS_POLICY: 'cors_policy',
    INPUT_VALIDATION: 'input_validation',
  },
  SEVERITY_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
  STATUS_TYPES: {
    PASS: 'pass',
    WARN: 'warn',
    FAIL: 'fail',
  },
  SCORE_WEIGHTS: {
    PASS: 100,
    WARN: 50,
    FAIL: 0,
  },
} as const;

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  GITHUB_API: {
    REQUESTS_PER_HOUR: 5000,
    REQUESTS_PER_MINUTE: 100,
  },
  SNYK_API: {
    REQUESTS_PER_HOUR: 1000,
    REQUESTS_PER_MINUTE: 50,
  },
  OSV_API: {
    REQUESTS_PER_HOUR: 10000,
    REQUESTS_PER_MINUTE: 200,
  },
  NPM_AUDIT: {
    REQUESTS_PER_HOUR: 1000,
    REQUESTS_PER_MINUTE: 30,
  },
} as const;

// Error Handling Configuration
export const ERROR_CONFIG = {
  SENSITIVE_ERROR_PATTERNS: [
    /token/i,
    /password/i,
    /secret/i,
    /key/i,
    /credential/i,
    /auth/i,
  ],
  GENERIC_ERROR_MESSAGE: 'An error occurred while processing your request',
  LOG_SANITIZATION: true,
  STACK_TRACE_IN_PRODUCTION: false,
} as const;

// Utility function to generate CSP string
export function generateCSPString(): string {
  const directives = [
    `default-src ${CSP_CONFIG.DEFAULT_SRC.join(' ')}`,
    `script-src ${CSP_CONFIG.SCRIPT_SRC.join(' ')}`,
    `style-src ${CSP_CONFIG.STYLE_SRC.join(' ')}`,
    `font-src ${CSP_CONFIG.FONT_SRC.join(' ')}`,
    `img-src ${CSP_CONFIG.IMG_SRC.join(' ')}`,
    `connect-src ${CSP_CONFIG.CONNECT_SRC.join(' ')}`,
    `frame-ancestors ${CSP_CONFIG.FRAME_ANCESTORS.join(' ')}`,
    `base-uri ${CSP_CONFIG.BASE_URI.join(' ')}`,
    `form-action ${CSP_CONFIG.FORM_ACTION.join(' ')}`,
  ];

  if (CSP_CONFIG.UPGRADE_INSECURE_REQUESTS) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

// Utility function to validate token format
export function validateTokenFormat(token: string, type: keyof typeof TOKEN_CONFIG.VALIDATION_PATTERNS): boolean {
  const pattern = TOKEN_CONFIG.VALIDATION_PATTERNS[type];
  return pattern ? pattern.test(token) : true;
}

// Utility function to check if environment is secure
export function isSecureEnvironment(): boolean {
  if (typeof window === 'undefined') return true; // Server-side is considered secure
  
  return (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

// Utility function to sanitize error messages
export function sanitizeErrorMessage(error: string): string {
  if (!ERROR_CONFIG.LOG_SANITIZATION) return error;
  
  let sanitized = error;
  
  ERROR_CONFIG.SENSITIVE_ERROR_PATTERNS.forEach(pattern => {
    if (pattern.test(sanitized)) {
      sanitized = ERROR_CONFIG.GENERIC_ERROR_MESSAGE;
    }
  });
  
  return sanitized;
}

// Export all configurations as a single object for easy access
export const SECURITY_CONFIG = {
  ENCRYPTION: ENCRYPTION_CONFIG,
  CSP: CSP_CONFIG,
  HEADERS: SECURITY_HEADERS,
  PRIVACY: PRIVACY_CONFIG,
  TOKENS: TOKEN_CONFIG,
  AUDIT: AUDIT_CONFIG,
  RATE_LIMIT: RATE_LIMIT_CONFIG,
  ERROR: ERROR_CONFIG,
} as const;