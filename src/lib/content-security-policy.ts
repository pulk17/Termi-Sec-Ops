// Simplified CSP utility for reporting and validation only
// Actual CSP is set via Next.js headers in next.config.js

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'connect-src'?: string[];
  'font-src'?: string[];
  'worker-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
}

/**
 * Build CSP string from directives object
 */
export function buildCSPString(directives: CSPDirectives): string {
  return Object.entries(directives)
    .filter(([_, sources]) => Array.isArray(sources) && sources.length > 0)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Get production CSP directives
 */
export function getProductionCSP(): CSPDirectives {
  return {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': [
      "'self'",
      'https://api.github.com',
      'https://api.snyk.io',
      'https://osv-vulnerabilities.storage.googleapis.com',
      'https://registry.npmjs.org',
      'https:'
    ],
    'worker-src': ["'self'", 'blob:'],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"]
  };
}

/**
 * Get development CSP directives
 */
export function getDevelopmentCSP(): CSPDirectives {
  return {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': [
      "'self'",
      'https://api.github.com',
      'https://api.snyk.io',
      'https://osv-vulnerabilities.storage.googleapis.com',
      'https://registry.npmjs.org',
      'wss:',
      'ws:',
      'http:',
      'https:'
    ],
    'worker-src': ["'self'", 'blob:'],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"]
  };
}

/**
 * Report CSP violation (for monitoring)
 */
export function reportCSPViolation(violation: SecurityPolicyViolationEvent): void {
  console.warn('CSP Violation:', {
    blockedURI: violation.blockedURI,
    violatedDirective: violation.violatedDirective,
    sourceFile: violation.sourceFile,
    lineNumber: violation.lineNumber
  });
  
  // TODO: Send to monitoring service in production
  // Example: Send to your analytics/monitoring service
  // fetch('/api/csp-report', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     blockedURI: violation.blockedURI,
  //     violatedDirective: violation.violatedDirective,
  //     timestamp: new Date().toISOString()
  //   })
  // });
}

// Set up CSP violation listener
if (typeof document !== 'undefined') {
  document.addEventListener('securitypolicyviolation', reportCSPViolation);
}
