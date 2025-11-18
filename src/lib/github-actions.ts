import { GitHubClient } from './github';
import { ProjectInfo } from './project-analyzer';
import { toast } from 'sonner';

export interface WorkflowTemplate {
  name: string;
  description: string;
  category: 'security' | 'ci-cd' | 'deployment' | 'quality';
  projectTypes: string[];
  requiredSecrets?: string[];
  optionalSecrets?: string[];
  content: string;
  variables?: Record<string, string>;
}

export interface WorkflowGenerationOptions {
  enableSecurity: boolean;
  enableTesting: boolean;
  enableDeployment: boolean;
  enableCodeQuality: boolean;
  targetBranches: string[];
  deploymentTarget?: 'aws' | 'vercel' | 'netlify' | 'github-pages';
  awsRegion?: string;
  nodeVersion?: string;
  pythonVersion?: string;
  javaVersion?: string;
  goVersion?: string;
  customSteps?: WorkflowStep[];
}

export interface WorkflowStep {
  name: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  env?: Record<string, string>;
  if?: string;
  continueOnError?: boolean;
}

export interface GeneratedWorkflow {
  name: string;
  filename: string;
  content: string;
  description: string;
  requiredSecrets: string[];
  optionalSecrets: string[];
  estimatedRunTime: string;
  category: 'security' | 'ci-cd' | 'deployment' | 'quality';
}

export interface WorkflowDeploymentResult {
  success: boolean;
  workflowId?: string;
  runId?: string;
  url?: string;
  error?: string;
}

export class GitHubActionsGenerator {
  private client: GitHubClient;
  private templates: Map<string, WorkflowTemplate> = new Map();

  constructor(client: GitHubClient) {
    this.client = client;
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Security scanning workflow
    this.templates.set('security-scan', {
      name: 'Security Scan',
      description: 'Comprehensive security scanning with multiple tools',
      category: 'security',
      projectTypes: ['nodejs', 'python', 'java-maven', 'java-gradle', 'go', 'docker'],
      requiredSecrets: [],
      optionalSecrets: ['SNYK_TOKEN', 'SONAR_TOKEN'],
      content: this.getSecurityScanTemplate(),
      variables: {
        NODE_VERSION: '18',
        PYTHON_VERSION: '3.9',
        JAVA_VERSION: '11',
        GO_VERSION: '1.19'
      }
    });

    // CI/CD workflow
    this.templates.set('ci-cd', {
      name: 'CI/CD Pipeline',
      description: 'Continuous integration and deployment pipeline',
      category: 'ci-cd',
      projectTypes: ['nodejs', 'python', 'java-maven', 'java-gradle', 'go'],
      requiredSecrets: [],
      optionalSecrets: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'DOCKER_HUB_TOKEN'],
      content: this.getCICDTemplate(),
      variables: {
        NODE_VERSION: '18',
        PYTHON_VERSION: '3.9',
        JAVA_VERSION: '11',
        GO_VERSION: '1.19'
      }
    });

    // AWS deployment workflow
    this.templates.set('aws-deploy', {
      name: 'AWS Deployment',
      description: 'Deploy to AWS ECS/ECR with security scanning',
      category: 'deployment',
      projectTypes: ['nodejs', 'python', 'java-maven', 'java-gradle', 'go', 'docker'],
      requiredSecrets: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
      optionalSecrets: ['SNYK_TOKEN', 'ECR_REPOSITORY'],
      content: this.getAWSDeployTemplate(),
      variables: {
        AWS_REGION: 'us-east-1',
        ECR_REPOSITORY: 'my-app',
        ECS_SERVICE: 'my-service',
        ECS_CLUSTER: 'my-cluster'
      }
    });

    // Code quality workflow
    this.templates.set('code-quality', {
      name: 'Code Quality',
      description: 'Code quality checks with linting and testing',
      category: 'quality',
      projectTypes: ['nodejs', 'python', 'java-maven', 'java-gradle', 'go'],
      requiredSecrets: [],
      optionalSecrets: ['SONAR_TOKEN', 'CODECOV_TOKEN'],
      content: this.getCodeQualityTemplate(),
      variables: {
        NODE_VERSION: '18',
        PYTHON_VERSION: '3.9',
        JAVA_VERSION: '11',
        GO_VERSION: '1.19'
      }
    });
  }

  // Generate workflows based on project info and options
  async generateWorkflows(
    projectInfo: ProjectInfo,
    options: WorkflowGenerationOptions
  ): Promise<GeneratedWorkflow[]> {
    const workflows: GeneratedWorkflow[] = [];

    try {
      // Security workflow
      if (options.enableSecurity) {
        const securityWorkflow = await this.generateSecurityWorkflow(projectInfo, options);
        workflows.push(securityWorkflow);
      }

      // CI/CD workflow
      if (options.enableTesting) {
        const cicdWorkflow = await this.generateCICDWorkflow(projectInfo, options);
        workflows.push(cicdWorkflow);
      }

      // Deployment workflow
      if (options.enableDeployment && options.deploymentTarget) {
        const deploymentWorkflow = await this.generateDeploymentWorkflow(projectInfo, options);
        workflows.push(deploymentWorkflow);
      }

      // Code quality workflow
      if (options.enableCodeQuality) {
        const qualityWorkflow = await this.generateCodeQualityWorkflow(projectInfo, options);
        workflows.push(qualityWorkflow);
      }

      return workflows;

    } catch (error) {
      console.error('Failed to generate workflows:', error);
      throw error;
    }
  }

  private async generateSecurityWorkflow(
    projectInfo: ProjectInfo,
    options: WorkflowGenerationOptions
  ): Promise<GeneratedWorkflow> {
    const template = this.templates.get('security-scan')!;
    let content = template.content;

    // Customize based on project type
    content = this.customizeForProjectType(content, projectInfo, options);
    
    // Add custom steps if provided
    if (options.customSteps) {
      content = this.addCustomSteps(content, options.customSteps);
    }

    return {
      name: 'Security Scan',
      filename: 'security-scan.yml',
      content,
      description: 'Automated security scanning with Snyk, Trivy, and dependency checks',
      requiredSecrets: [],
      optionalSecrets: ['SNYK_TOKEN'],
      estimatedRunTime: '5-10 minutes',
      category: 'security'
    };
  }

  private async generateCICDWorkflow(
    projectInfo: ProjectInfo,
    options: WorkflowGenerationOptions
  ): Promise<GeneratedWorkflow> {
    const template = this.templates.get('ci-cd')!;
    let content = template.content;

    content = this.customizeForProjectType(content, projectInfo, options);
    
    if (options.customSteps) {
      content = this.addCustomSteps(content, options.customSteps);
    }

    return {
      name: 'CI/CD Pipeline',
      filename: 'ci-cd.yml',
      content,
      description: 'Continuous integration with testing, building, and optional deployment',
      requiredSecrets: [],
      optionalSecrets: ['DOCKER_HUB_TOKEN', 'NPM_TOKEN'],
      estimatedRunTime: '10-15 minutes',
      category: 'ci-cd'
    };
  }

  private async generateDeploymentWorkflow(
    projectInfo: ProjectInfo,
    options: WorkflowGenerationOptions
  ): Promise<GeneratedWorkflow> {
    let template: WorkflowTemplate;
    let requiredSecrets: string[] = [];
    let optionalSecrets: string[] = [];

    switch (options.deploymentTarget) {
      case 'aws':
        template = this.templates.get('aws-deploy')!;
        requiredSecrets = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
        optionalSecrets = ['SNYK_TOKEN'];
        break;
      case 'vercel':
        template = { ...this.templates.get('ci-cd')!, content: this.getVercelDeployTemplate() };
        requiredSecrets = ['VERCEL_TOKEN'];
        break;
      case 'netlify':
        template = { ...this.templates.get('ci-cd')!, content: this.getNetlifyDeployTemplate() };
        requiredSecrets = ['NETLIFY_AUTH_TOKEN'];
        break;
      case 'github-pages':
        template = { ...this.templates.get('ci-cd')!, content: this.getGitHubPagesTemplate() };
        requiredSecrets = [];
        break;
      default:
        throw new Error(`Unsupported deployment target: ${options.deploymentTarget}`);
    }

    let content = template.content;
    content = this.customizeForProjectType(content, projectInfo, options);
    
    if (options.customSteps) {
      content = this.addCustomSteps(content, options.customSteps);
    }

    return {
      name: `Deploy to ${options.deploymentTarget?.toUpperCase()}`,
      filename: `deploy-${options.deploymentTarget}.yml`,
      content,
      description: `Automated deployment to ${options.deploymentTarget}`,
      requiredSecrets,
      optionalSecrets,
      estimatedRunTime: '5-20 minutes',
      category: 'deployment'
    };
  }

  private async generateCodeQualityWorkflow(
    projectInfo: ProjectInfo,
    options: WorkflowGenerationOptions
  ): Promise<GeneratedWorkflow> {
    const template = this.templates.get('code-quality')!;
    let content = template.content;

    content = this.customizeForProjectType(content, projectInfo, options);
    
    if (options.customSteps) {
      content = this.addCustomSteps(content, options.customSteps);
    }

    return {
      name: 'Code Quality',
      filename: 'code-quality.yml',
      content,
      description: 'Code quality checks with linting, testing, and coverage',
      requiredSecrets: [],
      optionalSecrets: ['SONAR_TOKEN', 'CODECOV_TOKEN'],
      estimatedRunTime: '5-10 minutes',
      category: 'quality'
    };
  }

  // Deploy workflow to repository
  async deployWorkflow(
    owner: string,
    repo: string,
    workflow: GeneratedWorkflow,
    commitMessage?: string
  ): Promise<WorkflowDeploymentResult> {
    try {
      const path = `.github/workflows/${workflow.filename}`;
      const message = commitMessage || `Add ${workflow.name} workflow`;

      // Check if file already exists
      let sha: string | undefined;
      try {
        const existingFile = await this.client.getFileContent(owner, repo, path);
        const existingContent = await this.client.getRepositoryContent(owner, repo, path);
        if (Array.isArray(existingContent)) {
          throw new Error('Expected file, got directory');
        }
        sha = (existingContent as any).sha;
      } catch (error) {
        // File doesn't exist, which is fine
      }

      // Create or update the workflow file
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.client.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: btoa(workflow.content),
          sha
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to deploy workflow');
      }

      const result = await response.json();
      
      toast.success(`${workflow.name} workflow deployed successfully`);

      return {
        success: true,
        url: result.content.html_url
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      toast.error(`Failed to deploy ${workflow.name}: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Trigger workflow run
  async triggerWorkflow(
    owner: string,
    repo: string,
    workflowId: string,
    ref: string = 'main',
    inputs?: Record<string, any>
  ): Promise<WorkflowDeploymentResult> {
    try {
      await this.client.createWorkflowDispatch(owner, repo, workflowId, ref, inputs);
      
      // Get the latest run for this workflow
      const runs = await this.client.getWorkflowRuns(owner, repo, workflowId, { per_page: 1 });
      const latestRun = runs[0];

      toast.success('Workflow triggered successfully');

      return {
        success: true,
        runId: latestRun?.id.toString(),
        url: latestRun?.html_url
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to trigger workflow';
      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Monitor workflow run
  async monitorWorkflowRun(
    owner: string,
    repo: string,
    runId: number,
    onUpdate?: (run: any) => void
  ): Promise<any> {
    const pollInterval = 10000; // 10 seconds
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const run = await this.client.getWorkflowRun(owner, repo, runId);
          
          if (onUpdate) {
            onUpdate(run);
          }

          if (run.status === 'completed') {
            resolve(run);
            return;
          }

          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Workflow monitoring timeout'));
            return;
          }

          setTimeout(poll, pollInterval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  // Utility methods
  private customizeForProjectType(
    content: string,
    projectInfo: ProjectInfo,
    options: WorkflowGenerationOptions
  ): string {
    let customized = content;

    // Replace version placeholders
    customized = customized.replace(/\$\{NODE_VERSION\}/g, options.nodeVersion || '18');
    customized = customized.replace(/\$\{PYTHON_VERSION\}/g, options.pythonVersion || '3.9');
    customized = customized.replace(/\$\{JAVA_VERSION\}/g, options.javaVersion || '11');
    customized = customized.replace(/\$\{GO_VERSION\}/g, options.goVersion || '1.19');
    customized = customized.replace(/\$\{AWS_REGION\}/g, options.awsRegion || 'us-east-1');

    // Replace branch placeholders
    const branches = options.targetBranches.length > 0 ? options.targetBranches : ['main'];
    const branchList = branches.map(b => `      - ${b}`).join('\n');
    customized = customized.replace(/\$\{TARGET_BRANCHES\}/g, branchList);

    // Add project-specific steps based on package manager or framework
    if (projectInfo.packageManager === 'npm' || projectInfo.framework?.includes('Node')) {
      customized = this.addNodeJSSteps(customized, projectInfo);
    } else if (projectInfo.packageManager === 'pip' || projectInfo.language === 'Python') {
      customized = this.addPythonSteps(customized, projectInfo);
    } else if (projectInfo.buildTool === 'Maven') {
      customized = this.addMavenSteps(customized, projectInfo);
    } else if (projectInfo.buildTool === 'Gradle') {
      customized = this.addGradleSteps(customized, projectInfo);
    } else if (projectInfo.packageManager === 'go' || projectInfo.language === 'Go') {
      customized = this.addGoSteps(customized, projectInfo);
    }

    return customized;
  }

  private addCustomSteps(content: string, customSteps: WorkflowStep[]): string {
    const stepsYaml = customSteps.map(step => {
      let stepYaml = `      - name: ${step.name}\n`;
      
      if (step.uses) {
        stepYaml += `        uses: ${step.uses}\n`;
      }
      
      if (step.run) {
        stepYaml += `        run: ${step.run}\n`;
      }
      
      if (step.with) {
        stepYaml += `        with:\n`;
        Object.entries(step.with).forEach(([key, value]) => {
          stepYaml += `          ${key}: ${value}\n`;
        });
      }
      
      if (step.env) {
        stepYaml += `        env:\n`;
        Object.entries(step.env).forEach(([key, value]) => {
          stepYaml += `          ${key}: ${value}\n`;
        });
      }
      
      if (step.if) {
        stepYaml += `        if: ${step.if}\n`;
      }
      
      if (step.continueOnError) {
        stepYaml += `        continue-on-error: true\n`;
      }
      
      return stepYaml;
    }).join('\n');

    // Insert custom steps before the last step
    const lines = content.split('\n');
    const lastStepIndex = lines.findLastIndex(line => line.trim().startsWith('- name:'));
    
    if (lastStepIndex !== -1) {
      lines.splice(lastStepIndex, 0, stepsYaml);
    }

    return lines.join('\n');
  }

  private addNodeJSSteps(content: string, projectInfo: ProjectInfo): string {
    // Add Node.js specific steps like npm cache, package manager detection, etc.
    const packageManager = projectInfo.packageManager || 'npm';
    return content.replace(/npm ci/g, `${packageManager} ${packageManager === 'npm' ? 'ci' : 'install --frozen-lockfile'}`);
  }

  private addPythonSteps(content: string, projectInfo: ProjectInfo): string {
    // Add Python specific steps
    return content;
  }

  private addMavenSteps(content: string, projectInfo: ProjectInfo): string {
    // Add Maven specific steps
    return content;
  }

  private addGradleSteps(content: string, projectInfo: ProjectInfo): string {
    // Add Gradle specific steps
    return content;
  }

  private addGoSteps(content: string, projectInfo: ProjectInfo): string {
    // Add Go specific steps
    return content;
  }

  // Template methods
  private getSecurityScanTemplate(): string {
    return `name: Security Scan

on:
  push:
    branches:
\${TARGET_BRANCHES}
  pull_request:
    branches:
\${TARGET_BRANCHES}
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM

jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '\${NODE_VERSION}'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true
        
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
        continue-on-error: true
        
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
          
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'devsecops-pipeline'
          path: '.'
          format: 'HTML'
          
      - name: Upload OWASP Dependency Check results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: dependency-check-report
          path: reports/
          
      - name: Security scan summary
        if: always()
        run: |
          echo "## Security Scan Summary" >> \$GITHUB_STEP_SUMMARY
          echo "- npm audit: \$(npm audit --audit-level=moderate --json | jq -r '.metadata.vulnerabilities.total // 0') vulnerabilities found" >> \$GITHUB_STEP_SUMMARY
          echo "- Snyk scan: Check artifacts for detailed results" >> \$GITHUB_STEP_SUMMARY
          echo "- Trivy scan: Check Security tab for results" >> \$GITHUB_STEP_SUMMARY
          echo "- OWASP Dependency Check: Check artifacts for HTML report" >> \$GITHUB_STEP_SUMMARY`;
  }

  private getCICDTemplate(): string {
    return `name: CI/CD Pipeline

on:
  push:
    branches:
\${TARGET_BRANCHES}
  pull_request:
    branches:
\${TARGET_BRANCHES}

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '\${NODE_VERSION}'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linting
        run: npm run lint
        
      - name: Run tests
        run: npm test
        
      - name: Run build
        run: npm run build
        
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: dist/
          
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
          path: dist/
          
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment..."
          # Add your deployment commands here`;
  }

  private getAWSDeployTemplate(): string {
    return `name: Deploy to AWS

on:
  push:
    branches:
\${TARGET_BRANCHES}
  workflow_dispatch:

env:
  AWS_REGION: \${AWS_REGION}
  ECR_REPOSITORY: \${ECR_REPOSITORY}
  ECS_SERVICE: \${ECS_SERVICE}
  ECS_CLUSTER: \${ECS_CLUSTER}

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ env.AWS_REGION }}
          
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
        
      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          docker build -t \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG .
          docker push \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG
          echo "image=\$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG" >> \$GITHUB_OUTPUT
          
      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: \${{ steps.build-image.outputs.image }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
          
      - name: Deploy to Amazon ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition.json
          service: \${{ env.ECS_SERVICE }}
          cluster: \${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true`;
  }

  private getCodeQualityTemplate(): string {
    return `name: Code Quality

on:
  push:
    branches:
\${TARGET_BRANCHES}
  pull_request:
    branches:
\${TARGET_BRANCHES}

jobs:
  quality:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '\${NODE_VERSION}'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run ESLint
        run: npm run lint -- --format=json --output-file=eslint-results.json
        continue-on-error: true
        
      - name: Run Prettier check
        run: npm run format:check
        continue-on-error: true
        
      - name: Run tests with coverage
        run: npm run test:coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: \${{ secrets.CODECOV_TOKEN }}
          file: ./coverage/lcov.info
          
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}
          
      - name: Quality Gate check
        uses: sonarqube-quality-gate-action@master
        timeout-minutes: 5
        env:
          SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}`;
  }

  private getVercelDeployTemplate(): string {
    return `name: Deploy to Vercel

on:
  push:
    branches:
\${TARGET_BRANCHES}

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'`;
  }

  private getNetlifyDeployTemplate(): string {
    return `name: Deploy to Netlify

on:
  push:
    branches:
\${TARGET_BRANCHES}

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '\${NODE_VERSION}'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.0
        with:
          publish-dir: './dist'
          production-branch: main
          github-token: \${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}`;
  }

  private getGitHubPagesTemplate(): string {
    return `name: Deploy to GitHub Pages

on:
  push:
    branches:
\${TARGET_BRANCHES}

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '\${NODE_VERSION}'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Setup Pages
        uses: actions/configure-pages@v3
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: './dist'
          
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2`;
  }

  // Get available templates
  getAvailableTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  // Get template by name
  getTemplate(name: string): WorkflowTemplate | undefined {
    return this.templates.get(name);
  }
}

// Create generator instance
export const createGitHubActionsGenerator = (client: GitHubClient): GitHubActionsGenerator => {
  return new GitHubActionsGenerator(client);
};