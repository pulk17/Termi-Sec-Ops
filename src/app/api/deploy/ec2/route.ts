import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'ssh2';
import * as fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageName, containerPort = 3000, hostPort = 3000 } = body;

    if (!imageName) {
      return NextResponse.json(
        { error: 'Invalid request: imageName required' },
        { status: 400 }
      );
    }

    // Get EC2 credentials from server environment ONLY
    const ec2Host = process.env.EC2_HOST;
    const ec2User = process.env.EC2_USER || 'ec2-user';
    const ec2KeyPath = process.env.EC2_PRIVATE_KEY_PATH;
    const ec2Password = process.env.EC2_PASSWORD; // Alternative to key

    if (!ec2Host) {
      return NextResponse.json(
        { error: 'EC2_HOST not configured in server environment' },
        { status: 500 }
      );
    }

    if (!ec2KeyPath && !ec2Password) {
      return NextResponse.json(
        { error: 'EC2_PRIVATE_KEY_PATH or EC2_PASSWORD must be configured in server environment' },
        { status: 500 }
      );
    }

    console.log(`🚀 Deploying ${imageName} to EC2: ${ec2Host}`);

    // Read private key if path is provided
    let privateKey: Buffer | undefined;
    if (ec2KeyPath) {
      try {
        privateKey = fs.readFileSync(ec2KeyPath);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to read private key: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Connect to EC2 via SSH
    const conn = new Client();
    const logs: string[] = [];

    const deploymentResult = await new Promise<{ success: boolean; logs: string[]; error?: string }>((resolve) => {
      conn.on('ready', () => {
        logs.push('✅ SSH connection established');
        console.log('✅ SSH connection established');

        // Commands to execute on EC2
        const commands = [
          // Stop and remove existing container if running
          `docker stop ${imageName.split(':')[0]} 2>/dev/null || true`,
          `docker rm ${imageName.split(':')[0]} 2>/dev/null || true`,
          // Pull the image (assumes it's pushed to a registry or built locally)
          // For local testing, you might need to save/load the image
          `docker pull ${imageName} 2>/dev/null || echo "Image not in registry, assuming local build"`,
          // Run the container
          `docker run -d --name ${imageName.split(':')[0]} -p ${hostPort}:${containerPort} ${imageName}`
        ];

        const executeCommands = (index: number) => {
          if (index >= commands.length) {
            conn.end();
            resolve({ success: true, logs });
            return;
          }

          const command = commands[index];
          logs.push(`$ ${command}`);
          console.log(`Executing: ${command}`);

          conn.exec(command, (err, stream) => {
            if (err) {
              logs.push(`❌ Error: ${err.message}`);
              conn.end();
              resolve({ success: false, logs, error: err.message });
              return;
            }

            let stdout = '';
            let stderr = '';

            stream.on('close', (code: number) => {
              if (stdout) logs.push(stdout);
              if (stderr) logs.push(stderr);
              
              if (code !== 0 && !command.includes('2>/dev/null')) {
                logs.push(`❌ Command failed with exit code ${code}`);
                conn.end();
                resolve({ success: false, logs, error: `Command failed with exit code ${code}` });
                return;
              }

              // Execute next command
              executeCommands(index + 1);
            });

            stream.on('data', (data: Buffer) => {
              stdout += data.toString();
            });

            stream.stderr.on('data', (data: Buffer) => {
              stderr += data.toString();
            });
          });
        };

        executeCommands(0);
      });

      conn.on('error', (err) => {
        logs.push(`❌ SSH connection error: ${err.message}`);
        console.error('SSH connection error:', err);
        resolve({ success: false, logs, error: err.message });
      });

      // Connect with either private key or password
      const connectionConfig: any = {
        host: ec2Host,
        port: 22,
        username: ec2User,
      };

      if (privateKey) {
        connectionConfig.privateKey = privateKey;
      } else if (ec2Password) {
        connectionConfig.password = ec2Password;
      }

      conn.connect(connectionConfig);
    });

    if (deploymentResult.success) {
      console.log('✅ Deployment completed successfully');
      return NextResponse.json({
        success: true,
        imageName,
        host: ec2Host,
        port: hostPort,
        logs: deploymentResult.logs,
        message: `Successfully deployed ${imageName} to EC2`,
        url: `http://${ec2Host}:${hostPort}`
      });
    } else {
      return NextResponse.json(
        { 
          error: deploymentResult.error || 'Deployment failed',
          logs: deploymentResult.logs
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('EC2 deployment error:', error);
    return NextResponse.json(
      { error: error.message || 'Deployment failed' },
      { status: 500 }
    );
  }
}
