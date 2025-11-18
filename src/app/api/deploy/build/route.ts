import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageName, dockerfile = 'Dockerfile', buildContext = '.' } = body;

    if (!imageName) {
      return NextResponse.json(
        { error: 'Invalid request: imageName required' },
        { status: 400 }
      );
    }

    console.log(`🐳 Building Docker image: ${imageName}`);

    // Check if Docker is installed and running
    try {
      const { stdout } = await execAsync('docker info', { timeout: 5000 });
      console.log('✓ Docker is running');
    } catch (error: any) {
      console.error('❌ Docker check failed:', error.message);
      return NextResponse.json(
        { 
          error: 'Docker is not running. Please start Docker Desktop and try again.',
          installUrl: 'https://docs.docker.com/get-docker/',
          logs: error.message
        },
        { status: 500 }
      );
    }

    // Check if Dockerfile exists in the current directory
    const fs = require('fs');
    const path = require('path');
    const dockerfilePath = path.join(process.cwd(), dockerfile);
    
    if (!fs.existsSync(dockerfilePath)) {
      console.error(`❌ Dockerfile not found at: ${dockerfilePath}`);
      
      // Generate a default Dockerfile
      const defaultDockerfile = `# Auto-generated Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;
      
      try {
        fs.writeFileSync(dockerfilePath, defaultDockerfile);
        console.log(`✓ Generated default Dockerfile at ${dockerfilePath}`);
      } catch (writeError: any) {
        return NextResponse.json(
          { 
            error: `Dockerfile not found and could not create default: ${writeError.message}`,
            logs: `Looked for Dockerfile at: ${dockerfilePath}`
          },
          { status: 500 }
        );
      }
    }

    // Build Docker image
    const buildCommand = `docker build -t ${imageName} -f ${dockerfile} ${buildContext}`;
    console.log(`📦 Executing: ${buildCommand}`);

    try {
      const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: process.cwd(),
        timeout: 600000, // 10 minute timeout for builds
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer for build logs
        killSignal: 'SIGKILL'
      });

      const logs = stdout + stderr;
      console.log('✅ Docker build completed successfully');
      console.log(logs);

      return NextResponse.json({
        success: true,
        imageName,
        logs,
        message: `Successfully built image: ${imageName}`
      });

    } catch (buildError: any) {
      const errorLogs = (buildError.stdout || '') + (buildError.stderr || '');
      console.error('❌ Docker build failed:', buildError.message);
      console.error(errorLogs);
      
      return NextResponse.json(
        { 
          error: `Docker build failed: ${buildError.message}`,
          logs: errorLogs || buildError.message
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Build API error:', error);
    return NextResponse.json(
      { error: error.message || 'Build failed' },
      { status: 500 }
    );
  }
}
