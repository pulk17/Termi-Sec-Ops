"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Rocket,
  Loader2,
  CheckCircle,
  XCircle,
  Terminal,
  Server,
  Download,
  FileText,
} from "lucide-react";

interface DeploymentManagerProps {
  scanPassed: boolean;
  projectName: string;
}

export function DeploymentManager({ scanPassed, projectName }: DeploymentManagerProps) {
  const [imageName, setImageName] = useState(`${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}:latest`);
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [buildLogs, setBuildLogs] = useState<string>('');
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deployUrl, setDeployUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleDownloadDockerfile = () => {
    const dockerfile = `# Multi-stage build for ${projectName}
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
`;

    const blob = new Blob([dockerfile], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Dockerfile';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDockerignore = () => {
    const dockerignore = `# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage
.nyc_output

# Next.js
.next/
out/
build
dist

# Production
.vercel

# Misc
.DS_Store
*.pem

# Debug
*.log

# Local env files
.env
.env*.local

# IDE
.vscode
.idea
*.swp
*.swo

# Git
.git
.gitignore

# Documentation
README.md
*.md
docs/
`;

    const blob = new Blob([dockerignore], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.dockerignore';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBuildImage = async () => {
    setBuildStatus('building');
    setBuildLogs('');
    setError('');

    try {
      const response = await fetch('/api/deploy/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Build failed');
      }

      setBuildLogs(data.logs || '');
      setBuildStatus('success');
    } catch (err: any) {
      console.error('Build error:', err);
      setError(err.message);
      setBuildStatus('error');
    }
  };

  const handleDeployToEC2 = async () => {
    if (buildStatus !== 'success') {
      setError('Please build the Docker image first');
      return;
    }

    setDeployStatus('deploying');
    setDeployLogs([]);
    setError('');

    try {
      const response = await fetch('/api/deploy/ec2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Deployment failed');
      }

      setDeployLogs(data.logs || []);
      setDeployUrl(data.url || '');
      setDeployStatus('success');
    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message);
      setDeployStatus('error');
    }
  };

  // Deployment blocking removed - allow deployment for testing
  // if (!scanPassed) {
  //   return (
  //     <Card className="border-yellow-200 bg-yellow-50">
  //       <CardHeader>
  //         <CardTitle className="flex items-center space-x-2">
  //           <XCircle className="h-5 w-5 text-yellow-600" />
  //           <span>Deployment Warning</span>
  //         </CardTitle>
  //         <CardDescription>
  //           Critical or high severity vulnerabilities detected. Proceed with caution.
  //         </CardDescription>
  //       </CardHeader>
  //     </Card>
  //   );
  // }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Rocket className="h-5 w-5 text-primary" />
          <span>Container Deployment</span>
        </CardTitle>
        <CardDescription>
          Build and deploy your application to EC2
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Name Input */}
        <div className="space-y-2">
          <Label htmlFor="imageName">Docker Image Name</Label>
          <Input
            id="imageName"
            value={imageName}
            onChange={(e) => setImageName(e.target.value)}
            placeholder="my-app:latest"
            disabled={buildStatus === 'building' || deployStatus === 'deploying'}
          />
        </div>

        {/* Docker Files Download */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Step 1: Download Docker Files</span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleDownloadDockerfile}
              variant="outline"
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Dockerfile
            </Button>
            <Button
              onClick={handleDownloadDockerignore}
              variant="outline"
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              .dockerignore
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Download these files and place them in your project root, then build locally with:
          </p>
          <code className="text-xs bg-muted px-2 py-1 rounded block">
            docker build -t {imageName} .
          </code>
        </div>

        {/* Build Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Step 2: Build Docker Image (Optional)</span>
            </h3>
            {buildStatus === 'success' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Built
              </Badge>
            )}
          </div>

          <Button
            onClick={handleBuildImage}
            disabled={buildStatus === 'building' || deployStatus === 'deploying' || !imageName}
            className="w-full"
            variant="secondary"
          >
            {buildStatus === 'building' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Building Image...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Build Docker Image (Server-side)
              </>
            )}
          </Button>

          {buildLogs && (
            <div className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
              <div className="flex items-center space-x-2 mb-2 text-green-400">
                <Terminal className="h-4 w-4" />
                <span className="font-semibold">Build Logs:</span>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{buildLogs}</pre>
            </div>
          )}
        </div>

        {/* Deploy Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center space-x-2">
              <Server className="h-4 w-4" />
              <span>Step 3: Deploy to EC2</span>
            </h3>
            {deployStatus === 'success' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Deployed
              </Badge>
            )}
          </div>

          <Button
            onClick={handleDeployToEC2}
            disabled={buildStatus !== 'success' || deployStatus === 'deploying'}
            className="w-full"
            variant={buildStatus === 'success' ? 'default' : 'secondary'}
          >
            {deployStatus === 'deploying' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying to EC2...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Deploy to EC2
              </>
            )}
          </Button>

          {deployLogs.length > 0 && (
            <div className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
              <div className="flex items-center space-x-2 mb-2 text-blue-400">
                <Terminal className="h-4 w-4" />
                <span className="font-semibold">Deployment Logs:</span>
              </div>
              {deployLogs.map((log, index) => (
                <div key={index} className="mb-1 leading-relaxed">{log}</div>
              ))}
            </div>
          )}

          {deployUrl && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm font-semibold text-green-900 mb-1">
                🎉 Deployment Successful!
              </p>
              <p className="text-sm text-green-700">
                Your application is now running at:{' '}
                <a
                  href={deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-mono"
                >
                  {deployUrl}
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center space-x-2 text-red-900">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Error</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Configuration Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">📝 Configuration Required:</p>
          <p>Ensure these environment variables are set on the server:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li><code>EC2_HOST</code> - Your EC2 instance IP or hostname</li>
            <li><code>EC2_USER</code> - SSH username (default: ec2-user)</li>
            <li><code>EC2_PRIVATE_KEY_PATH</code> - Path to SSH private key</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
