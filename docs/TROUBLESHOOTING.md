# 🔧 Troubleshooting Guide

Common issues and solutions for DevSecOps Security Pipeline.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Scanning Issues](#scanning-issues)
- [API Issues](#api-issues)
- [Docker Issues](#docker-issues)
- [Performance Issues](#performance-issues)
- [Security Issues](#security-issues)

---

## Installation Issues

### Issue: npm install fails

**Symptoms:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solutions:**

1. **Clear npm cache:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

2. **Use legacy peer deps:**
```bash
npm install --legacy-peer-deps
```

3. **Update Node.js:**
```bash
node --version  # Should be 18+
nvm install 18
nvm use 18
```

---

### Issue: TypeScript errors during build

**Symptoms:**
```
Type error: Cannot find module '@/lib/utils'
```

**Solutions:**

1. **Check tsconfig.json paths:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

2. **Restart TypeScript server:**
- VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

3. **Rebuild:**
```bash
npm run type-check
npm run build
```

---

## Scanning Issues

### Issue: Scan fails immediately

**Symptoms:**
- Scan status shows "failed"
- Error: "Failed to analyze repository"

**Solutions:**

1. **Check repository URL:**
```bash
# Valid formats:
https://github.com/owner/repo
github.com/owner/repo
owner/repo
```

2. **Check GitHub token (for private repos):**
```bash
# Test token
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user
```

3. **Check logs:**
```bash
# Browser console
# Look for API errors
```

---

### Issue: Security score shows 0

**Symptoms:**
- Security score displays as 0
- But vulnerabilities are found

**Explanation:**
The security score is **dynamically calculated**:
- Base score: 100
- Critical: -10 points each
- High: -5 points each
- Medium: -2 points each
- Low: -1 point each

If score is 0, you have too many vulnerabilities (100+ points deducted).

**Solution:**
This is working as intended. Fix critical and high vulnerabilities to improve score.

---

### Issue: npm audit scan fails

**Symptoms:**
```
❌ npm audit failed: ENOTFOUND registry.npmjs.org
```

**Solutions:**

1. **Check internet connection:**
```bash
ping registry.npmjs.org
```

2. **Check npm registry:**
```bash
npm config get registry
# Should be: https://registry.npmjs.org/
```

3. **Reset npm registry:**
```bash
npm config set registry https://registry.npmjs.org/
```

---

### Issue: OSV scan returns no results

**Symptoms:**
- OSV scan completes but finds 0 vulnerabilities
- Other scanners find issues

**Solutions:**

1. **Check OSV API:**
```bash
curl https://api.osv.dev/v1/query \
  -d '{"package":{"name":"lodash","ecosystem":"npm"},"version":"4.17.15"}'
```

2. **Check package ecosystem:**
- OSV supports: npm, PyPI, Go, Maven, etc.
- Ensure correct ecosystem mapping

---

### Issue: Snyk scan fails

**Symptoms:**
```
❌ Snyk scan failed: 401 Unauthorized
```

**Solutions:**

1. **Check API key:**
```bash
# In .env.local
SNYK_TOKEN=your_snyk_api_token
```

2. **Verify token:**
```bash
curl -H "Authorization: token YOUR_SNYK_TOKEN" \
  https://api.snyk.io/v1/user/me
```

3. **Get new token:**
- Visit https://app.snyk.io/account
- Generate new API token
- Update .env.local

---

## API Issues

### Issue: AI suggestions not working

**Symptoms:**
- "Get AI Suggestion" button does nothing
- Error: "Failed to generate AI suggestion"

**Solutions:**

1. **Check Gemini API key:**
```bash
# In .env.local
GEMINI_API_KEY=your_gemini_api_key
```

2. **Verify API key:**
- Visit https://makersuite.google.com/app/apikey
- Check key is active
- Check quota remaining

3. **Check browser console:**
```javascript
// Look for errors like:
// "GEMINI_API_KEY not configured"
```

4. **Restart dev server:**
```bash
# Stop server (Ctrl+C)
npm run dev
```

---

### Issue: AWS scanning fails

**Symptoms:**
```
❌ AWS scan failed: The security token included in the request is invalid
```

**Solutions:**

1. **Check AWS credentials:**
```bash
# In .env.local
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

2. **Verify credentials:**
```bash
aws sts get-caller-identity
```

3. **Check IAM permissions:**
Required policies:
- `AmazonEC2ContainerRegistryReadOnly`
- `AmazonECS_ReadOnlyAccess`
- `AmazonInspector2ReadOnlyAccess`

---

### Issue: Rate limit exceeded

**Symptoms:**
```
429 Too Many Requests
X-RateLimit-Remaining: 0
```

**Solutions:**

1. **Wait for rate limit reset:**
```bash
# Check reset time in response headers
X-RateLimit-Reset: 1642248600
```

2. **Reduce scan frequency:**
- Don't scan same repo multiple times quickly
- Use cached results when possible

3. **Upgrade API plan:**
- Snyk: Upgrade to paid plan
- GitHub: Use authenticated requests

---

## Docker Issues

### Issue: Container won't start

**Symptoms:**
```
docker-compose up -d
ERROR: Container exited with code 1
```

**Solutions:**

1. **Check logs:**
```bash
docker-compose logs app
```

2. **Check environment variables:**
```bash
docker-compose config
```

3. **Rebuild container:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

### Issue: Port already in use

**Symptoms:**
```
Error: bind: address already in use
```

**Solutions:**

1. **Find process using port:**
```bash
# Linux/Mac
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

2. **Kill process:**
```bash
# Linux/Mac
kill -9 <PID>

# Windows
taskkill /PID <PID> /F
```

3. **Use different port:**
```yaml
# docker-compose.yml
ports:
  - "3001:3000"
```

---

### Issue: Out of disk space

**Symptoms:**
```
no space left on device
```

**Solutions:**

1. **Clean Docker:**
```bash
docker system prune -a
docker volume prune
```

2. **Check disk usage:**
```bash
df -h
docker system df
```

---

## Performance Issues

### Issue: Slow scan times

**Symptoms:**
- Scans take 5+ minutes
- Browser becomes unresponsive

**Solutions:**

1. **Reduce scan scope:**
```javascript
{
  scanOptions: {
    enableOSV: true,
    enableNpmAudit: true,
    enableSnyk: false,  // Disable if not needed
    scanContainers: false  // Disable if not needed
  }
}
```

2. **Increase server resources:**
```yaml
# docker-compose.yml
services:
  app:
    mem_limit: 2g
    cpus: 2
```

3. **Enable caching:**
- Results are cached in IndexedDB
- Reuse recent scan results

---

### Issue: High memory usage

**Symptoms:**
- Browser tab uses 1GB+ RAM
- System becomes slow

**Solutions:**

1. **Close unused tabs:**
- Keep only one scan tab open

2. **Clear browser cache:**
```javascript
// In browser console
indexedDB.deleteDatabase('devsecops-db');
```

3. **Restart browser:**
- Close and reopen browser

---

## Security Issues

### Issue: CORS errors

**Symptoms:**
```
Access to fetch at 'https://api.osv.dev' has been blocked by CORS policy
```

**Solutions:**

1. **Use server-side proxy:**
- All external API calls should go through Next.js API routes
- Never call external APIs directly from client

2. **Check API route:**
```typescript
// Should be in /api/ directory
// src/app/api/scan/osv/route.ts
```

---

### Issue: Credentials exposed in client

**Symptoms:**
- API keys visible in browser DevTools
- Environment variables prefixed with `NEXT_PUBLIC_`

**Solutions:**

1. **Remove NEXT_PUBLIC_ prefix:**
```bash
# ❌ Bad - exposed to client
NEXT_PUBLIC_SNYK_TOKEN=secret

# ✅ Good - server-side only
SNYK_TOKEN=secret
```

2. **Use API routes:**
```typescript
// ❌ Bad - client-side API call
const response = await fetch('https://api.snyk.io', {
  headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SNYK_TOKEN}` }
});

// ✅ Good - server-side API route
const response = await fetch('/api/scan/snyk', {
  method: 'POST',
  body: JSON.stringify({ repo: 'owner/repo' })
});
```

---

## Database Issues

### Issue: IndexedDB quota exceeded

**Symptoms:**
```
QuotaExceededError: The quota has been exceeded
```

**Solutions:**

1. **Clear old scans:**
```javascript
// In browser console
const db = await window.indexedDB.open('devsecops-db');
// Delete old records
```

2. **Increase quota:**
- Chrome: Settings → Privacy → Site Settings → Storage
- Firefox: about:config → dom.indexedDB.quota

---

## Getting Help

If you can't find a solution:

1. **Check GitHub Issues:**
   - https://github.com/yourusername/devsecops-pipeline/issues

2. **Search Discussions:**
   - https://github.com/yourusername/devsecops-pipeline/discussions

3. **Create New Issue:**
   - Include error messages
   - Include steps to reproduce
   - Include environment details (OS, Node version, etc.)

4. **Join Discord:**
   - https://discord.gg/devsecops

5. **Email Support:**
   - support@yourdomain.com

---

## Debug Mode

Enable debug logging:

```bash
# Add to .env.local
DEBUG=devsecops:*
NODE_ENV=development
LOG_LEVEL=debug
```

View logs:
```bash
# Development
npm run dev

# Production
docker-compose logs -f app
```

---

For more information, see the [main documentation](../README.md).
