# 🔌 API Reference

Complete API documentation for the DevSecOps Security Pipeline.

## Table of Contents

- [Authentication](#authentication)
- [Scan APIs](#scan-apis)
- [AI APIs](#ai-apis)
- [Project APIs](#project-apis)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

---

## Authentication

### GitHub OAuth

For scanning private repositories, you need to authenticate with GitHub.

**Endpoint**: `GET /api/auth/github`

**Response**: Redirects to GitHub OAuth flow

**Callback**: `GET /api/auth/callback/github`

---

## Scan APIs

### Start Security Scan

Initiates a new security scan for a GitHub repository.

**Endpoint**: `POST /api/scan/start`

**Request Body**:
```json
{
  "repoUrl": "https://github.com/owner/repository",
  "githubToken": "optional_github_token",
  "scanOptions": {
    "enableOSV": true,
    "enableNpmAudit": true,
    "enableSnyk": true,
    "enableTrivy": false,
    "enableGitHubActions": true,
    "scanDependencies": true,
    "scanCode": true,
    "scanContainers": false
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "scanId": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": 123,
  "status": "queued",
  "message": "Scan started successfully"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Invalid repository URL"
}
```

---

### Get Scan Status

Retrieves the current status and progress of a scan.

**Endpoint**: `GET /api/scan/status/:scanId`

**Parameters**:
- `scanId` (string, required): UUID of the scan

**Response** (200 OK):
```json
{
  "scanId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "progress": {
    "stage": "scanning",
    "percentage": 45,
    "message": "Running npm audit scan...",
    "currentTask": "npm-audit"
  },
  "startedAt": "2024-01-15T10:30:00.000Z",
  "estimatedCompletion": "2024-01-15T10:35:00.000Z"
}
```

**Status Values**:
- `queued` - Scan is waiting to start
- `running` - Scan is in progress
- `completed` - Scan finished successfully
- `failed` - Scan encountered an error

**Stage Values**:
- `initializing` - Setting up scan environment
- `analyzing` - Analyzing project structure
- `scanning` - Running security scans
- `reporting` - Generating report
- `completed` - Scan complete

---

### Get Scan Results

Retrieves the complete results of a finished scan.

**Endpoint**: `GET /api/scan/results/:scanId`

**Parameters**:
- `scanId` (string, required): UUID of the scan

**Response** (200 OK):
```json
{
  "scanId": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": 123,
  "status": "completed",
  "startedAt": "2024-01-15T10:30:00.000Z",
  "completedAt": "2024-01-15T10:35:00.000Z",
  "duration": 300000,
  "summary": {
    "totalVulnerabilities": 15,
    "criticalCount": 2,
    "highCount": 5,
    "mediumCount": 6,
    "lowCount": 2,
    "fixableCount": 12,
    "securityScore": 65,
    "riskLevel": "high"
  },
  "vulnerabilities": [
    {
      "id": "CVE-2024-12345",
      "title": "Prototype Pollution in lodash",
      "description": "Versions of lodash prior to 4.17.21 are vulnerable to prototype pollution.",
      "severity": "high",
      "packageName": "lodash",
      "version": "4.17.15",
      "fixedIn": "4.17.21",
      "cvssScore": 7.5,
      "references": [
        "https://nvd.nist.gov/vuln/detail/CVE-2024-12345",
        "https://github.com/advisories/GHSA-xxxx-xxxx-xxxx"
      ],
      "source": "npm-audit"
    }
  ],
  "scanOptions": {
    "enableOSV": true,
    "enableNpmAudit": true,
    "enableSnyk": true,
    "scanDependencies": true,
    "scanCode": true
  }
}
```

---

### Snyk Scan

Performs Snyk vulnerability scanning (server-side).

**Endpoint**: `POST /api/scan/snyk`

**Request Body**:
```json
{
  "repository": "owner/repo",
  "packageManager": "npm"
}
```

**Response** (200 OK):
```json
[
  {
    "id": "SNYK-JS-LODASH-590103",
    "title": "Prototype Pollution",
    "description": "lodash is vulnerable to Prototype Pollution",
    "severity": "high",
    "packageName": "lodash",
    "version": "4.17.15",
    "fixedIn": "4.17.21",
    "cvssScore": 7.4,
    "references": [
      "https://snyk.io/vuln/SNYK-JS-LODASH-590103"
    ],
    "source": "snyk"
  }
]
```

---

### Trivy Scan

Performs Trivy container and filesystem scanning (server-side).

**Endpoint**: `POST /api/scan/trivy`

**Request Body**:
```json
{
  "repository": "owner/repo",
  "scanPath": "."
}
```

**Response** (200 OK):
```json
[
  {
    "id": "CVE-2024-12345",
    "title": "Critical vulnerability in base image",
    "description": "Alpine Linux base image contains a critical vulnerability",
    "severity": "critical",
    "packageName": "alpine-base",
    "version": "3.14.0",
    "fixedIn": "3.14.2",
    "cvssScore": 9.8,
    "references": [
      "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-12345"
    ],
    "source": "manual"
  }
]
```

---

### AWS Security Scan

Performs AWS security scanning (ECR, ECS, Inspector2).

**Endpoint**: `POST /api/scan/aws`

**Request Body**:
```json
{
  "scanType": "ecr",
  "resourceId": "my-repository",
  "region": "us-east-1"
}
```

**Scan Types**:
- `ecr` - Scan ECR container images
- `ecs` - Scan ECS tasks and services
- `inspector` - Run AWS Inspector assessment

**Response** (200 OK):
```json
{
  "success": true,
  "findings": [
    {
      "id": "finding-12345",
      "severity": "HIGH",
      "title": "Vulnerable package detected",
      "description": "Container image contains vulnerable package",
      "resource": "my-repository:latest",
      "recommendation": "Update to patched version"
    }
  ]
}
```

---

## AI APIs

### Get AI Fix Suggestion

Generates AI-powered fix suggestions using Google Gemini.

**Endpoint**: `POST /api/ai/suggest-fix`

**Request Body**:
```json
{
  "vulnerability": {
    "id": "CVE-2024-12345",
    "title": "Prototype Pollution in lodash",
    "description": "Versions of lodash prior to 4.17.21 are vulnerable",
    "severity": "high",
    "packageName": "lodash",
    "version": "4.17.15",
    "fixedIn": "4.17.21"
  }
}
```

**Response** (200 OK):
```json
{
  "suggestion": "## Root Cause\n\nThe vulnerability exists because lodash version 4.17.15 contains a prototype pollution vulnerability (CVE-2024-12345)...\n\n## Fix Steps\n\n1. Update lodash to version 4.17.21 or higher\n2. Run: `npm install lodash@^4.17.21`\n3. Test your application\n4. Commit package-lock.json\n\n## Prevention\n\n- Enable Dependabot\n- Run npm audit regularly\n- Use npm audit fix"
}
```

**Response** (500 Internal Server Error):
```json
{
  "error": "Failed to generate AI suggestion",
  "details": "GEMINI_API_KEY not configured"
}
```

---

## Project APIs

### Create Project

Creates a new project entry.

**Endpoint**: `POST /api/projects`

**Request Body**:
```json
{
  "name": "my-project",
  "owner": "github-username",
  "repoUrl": "https://github.com/owner/repo",
  "description": "Project description"
}
```

**Response** (201 Created):
```json
{
  "id": 123,
  "name": "my-project",
  "owner": "github-username",
  "repoUrl": "https://github.com/owner/repo",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### Get Project

Retrieves project details.

**Endpoint**: `GET /api/projects/:projectId`

**Response** (200 OK):
```json
{
  "id": 123,
  "name": "my-project",
  "owner": "github-username",
  "repoUrl": "https://github.com/owner/repo",
  "description": "Project description",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "lastScanAt": "2024-01-15T10:35:00.000Z",
  "scanCount": 5
}
```

---

### List Projects

Lists all projects.

**Endpoint**: `GET /api/projects`

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sort` (string, optional): Sort field (default: "createdAt")
- `order` (string, optional): Sort order "asc" or "desc" (default: "desc")

**Response** (200 OK):
```json
{
  "projects": [
    {
      "id": 123,
      "name": "my-project",
      "owner": "github-username",
      "lastScanAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REPO_URL` | Repository URL is invalid |
| `SCAN_NOT_FOUND` | Scan ID does not exist |
| `PROJECT_NOT_FOUND` | Project ID does not exist |
| `API_KEY_MISSING` | Required API key not configured |
| `API_KEY_INVALID` | API key is invalid or expired |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `SCAN_FAILED` | Scan encountered an error |
| `AI_GENERATION_FAILED` | AI suggestion generation failed |

---

## Rate Limiting

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/scan/start` | 10 requests | 1 minute |
| `/api/scan/status/:id` | 60 requests | 1 minute |
| `/api/scan/results/:id` | 30 requests | 1 minute |
| `/api/ai/suggest-fix` | 20 requests | 1 minute |
| All other endpoints | 100 requests | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1642248600
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60,
  "limit": 10,
  "window": "1 minute"
}
```

---

## Examples

### Example 1: Complete Scan Flow

```javascript
// 1. Start scan
const startResponse = await fetch('/api/scan/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    repoUrl: 'https://github.com/owner/repo',
    scanOptions: {
      enableOSV: true,
      enableNpmAudit: true,
      scanDependencies: true
    }
  })
});

const { scanId } = await startResponse.json();

// 2. Poll for status
const pollStatus = async () => {
  const statusResponse = await fetch(`/api/scan/status/${scanId}`);
  const status = await statusResponse.json();
  
  if (status.status === 'completed') {
    return status;
  } else if (status.status === 'failed') {
    throw new Error('Scan failed');
  }
  
  // Wait and poll again
  await new Promise(resolve => setTimeout(resolve, 2000));
  return pollStatus();
};

await pollStatus();

// 3. Get results
const resultsResponse = await fetch(`/api/scan/results/${scanId}`);
const results = await resultsResponse.json();

console.log(`Found ${results.summary.totalVulnerabilities} vulnerabilities`);
console.log(`Security Score: ${results.summary.securityScore}/100`);
```

### Example 2: Get AI Suggestion

```javascript
const vulnerability = {
  id: 'CVE-2024-12345',
  title: 'Prototype Pollution',
  severity: 'high',
  packageName: 'lodash',
  version: '4.17.15',
  fixedIn: '4.17.21'
};

const response = await fetch('/api/ai/suggest-fix', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vulnerability })
});

const { suggestion } = await response.json();
console.log(suggestion);
```

### Example 3: Error Handling

```javascript
try {
  const response = await fetch('/api/scan/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl: 'invalid-url' })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  const data = await response.json();
  console.log('Scan started:', data.scanId);
  
} catch (error) {
  console.error('Failed to start scan:', error.message);
}
```

---

## Webhooks (Coming Soon)

Future support for webhooks to receive scan completion notifications.

**Endpoint**: `POST /api/webhooks/register`

**Request Body**:
```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["scan.completed", "scan.failed"],
  "secret": "your-webhook-secret"
}
```

---

## SDK Support (Coming Soon)

Official SDKs for popular languages:

- JavaScript/TypeScript
- Python
- Go
- Ruby
- Java

---

For more information, see the [main documentation](../README.md).
