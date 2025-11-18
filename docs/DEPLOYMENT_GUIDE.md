# 🚀 Deployment Guide

Complete guide for deploying DevSecOps Security Pipeline to production.

## Table of Contents

- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [Vercel Deployment](#vercel-deployment)
- [AWS Deployment](#aws-deployment)
- [Nginx Configuration](#nginx-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Environment Variables](#environment-variables)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

---

## Deployment Options

| Platform | Difficulty | Cost | Best For |
|----------|-----------|------|----------|
| **Docker** | Easy | Low | Self-hosted, full control |
| **Vercel** | Very Easy | Free tier available | Quick deployment, serverless |
| **AWS** | Medium | Pay-as-you-go | Enterprise, scalability |
| **DigitalOcean** | Easy | $5-20/month | Small teams |
| **Heroku** | Easy | Free tier available | Prototypes, demos |

---

## Docker Deployment

### Prerequisites

- Docker 20.10.0+
- Docker Compose 2.0.0+
- 2GB RAM minimum
- 10GB disk space

### Quick Deploy

```bash
# Clone repository
git clone https://github.com/yourusername/devsecops-pipeline.git
cd devsecops-pipeline

# Create production environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production

# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Docker Compose Configuration

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped
```

### Dockerfile Optimization

**Multi-stage build for smaller images**:

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Docker Commands

```bash
# Build image
docker build -t devsecops-pipeline:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  --name devsecops \
  --env-file .env.production \
  devsecops-pipeline:latest

# View logs
docker logs -f devsecops

# Stop container
docker stop devsecops

# Remove container
docker rm devsecops

# Restart container
docker restart devsecops

# Execute command in container
docker exec -it devsecops sh

# View resource usage
docker stats devsecops
```

---

## Vercel Deployment

### Prerequisites

- Vercel account
- GitHub repository
- Vercel CLI (optional)

### Deploy via Vercel Dashboard

1. **Import Project**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Select "Next.js" framework preset

2. **Configure Environment Variables**
   - Add all variables from `.env.example`
   - Mark sensitive variables as "Secret"

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your deployment URL

### Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add SNYK_TOKEN
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add GEMINI_API_KEY
```

### Vercel Configuration

**vercel.json**:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## AWS Deployment

### Architecture

```
Internet
    ↓
Application Load Balancer (ALB)
    ↓
ECS Fargate Tasks (Auto-scaling)
    ↓
RDS PostgreSQL (Optional)
```

### Prerequisites

- AWS Account
- AWS CLI configured
- ECR repository
- ECS cluster

### Step 1: Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t devsecops-pipeline .

# Tag image
docker tag devsecops-pipeline:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/devsecops-pipeline:latest

# Push image
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/devsecops-pipeline:latest
```

### Step 2: Create ECS Task Definition

**task-definition.json**:

```json
{
  "family": "devsecops-pipeline",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/devsecops-pipeline:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "SNYK_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:snyk-token"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/devsecops-pipeline",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 3: Create ECS Service

```bash
aws ecs create-service \
  --cluster devsecops-cluster \
  --service-name devsecops-service \
  --task-definition devsecops-pipeline \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/devsecops-tg/1234567890,containerName=app,containerPort=3000"
```

### Step 4: Configure Auto-scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/devsecops-cluster/devsecops-service \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/devsecops-cluster/devsecops-service \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

---

## Nginx Configuration

### Production nginx.conf

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;

    # Upstream
    upstream nextjs {
        server app:3000;
        keepalive 32;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # General rate limiting
        location / {
            limit_req zone=general burst=50 nodelay;
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static files caching
        location /_next/static/ {
            proxy_pass http://nextjs;
            proxy_cache_valid 200 365d;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

---

## SSL/TLS Setup

### Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (cron job)
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet
```

### Manual Certificate

```bash
# Generate private key
openssl genrsa -out privkey.pem 2048

# Generate CSR
openssl req -new -key privkey.pem -out csr.pem

# Get certificate from CA
# Place fullchain.pem and privkey.pem in /etc/nginx/ssl/
```

---

## Environment Variables

### Production Environment Variables

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Security Scanning
SNYK_TOKEN=your_production_snyk_token
AWS_ACCESS_KEY_ID=your_production_aws_key
AWS_SECRET_ACCESS_KEY=your_production_aws_secret
AWS_REGION=us-east-1
GEMINI_API_KEY=your_production_gemini_key

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/devsecops

# Encryption
ENCRYPTION_KEY=your_32_character_production_key
SESSION_SECRET=your_production_session_secret

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

### Managing Secrets

**AWS Secrets Manager**:

```bash
# Store secret
aws secretsmanager create-secret \
  --name devsecops/snyk-token \
  --secret-string "your-snyk-token"

# Retrieve secret
aws secretsmanager get-secret-value \
  --secret-id devsecops/snyk-token \
  --query SecretString \
  --output text
```

**Docker Secrets**:

```bash
# Create secret
echo "your-snyk-token" | docker secret create snyk_token -

# Use in docker-compose.yml
secrets:
  snyk_token:
    external: true
```

---

## Monitoring

### Health Check Endpoint

**src/app/api/health/route.ts**:

```typescript
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
}
```

### Logging

**Winston Logger**:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### Monitoring Tools

- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **Sentry** - Error tracking
- **DataDog** - APM
- **New Relic** - Performance monitoring

---

## Backup & Recovery

### Database Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U postgres devsecops > backup.sql

# Restore
psql -h localhost -U postgres devsecops < backup.sql
```

### Docker Volume Backup

```bash
# Backup volume
docker run --rm \
  -v devsecops_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/data-backup.tar.gz /data

# Restore volume
docker run --rm \
  -v devsecops_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/data-backup.tar.gz -C /
```

---

## Troubleshooting

### Common Issues

**Issue: Container won't start**

```bash
# Check logs
docker logs devsecops

# Check container status
docker ps -a

# Inspect container
docker inspect devsecops
```

**Issue: High memory usage**

```bash
# Check memory
docker stats

# Increase memory limit in docker-compose.yml
services:
  app:
    mem_limit: 2g
```

**Issue: SSL certificate errors**

```bash
# Verify certificate
openssl x509 -in /etc/nginx/ssl/fullchain.pem -text -noout

# Test SSL
curl -vI https://yourdomain.com
```

---

## Performance Optimization

### Next.js Optimization

```javascript
// next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  images: {
    domains: ['yourdomain.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  experimental: {
    optimizeCss: true,
  },
};
```

### Caching Strategy

```nginx
# Nginx caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 1h;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
}
```

---

For more information, see the [main documentation](../README.md).
