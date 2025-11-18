import { GitHubClient, GitHubContent } from './github';

export interface Dependency {
  name: string;
  version: string;
  ecosystem: string;
  isDev?: boolean;
}

export interface ProjectInfo {
  name: string;
  description?: string;
  language: string;
  framework?: string;
  dependencies: Dependency[];
  devDependencies: Dependency[];
  hasDockerfile: boolean;
  hasCI: boolean;
  ciPlatform?: string;
  packageManager?: string;
  buildTool?: string;
}

export class ProjectAnalyzer {
  private githubClient: GitHubClient;
  private owner: string;
  private repo: string;
  private ref?: string;

  constructor(githubClient: GitHubClient, owner: string, repo: string, ref?: string) {
    this.githubClient = githubClient;
    this.owner = owner;
    this.repo = repo;
    this.ref = ref;
  }

  async analyzeProject(): Promise<ProjectInfo> {
    try {
      // Get repository information
      const repoInfo = await this.githubClient.getRepository(this.owner, this.repo);
      
      // Get root directory contents
      const rootContents = await this.githubClient.getRepositoryContent(
        this.owner,
        this.repo,
        '',
        this.ref
      );

      // Detect project type and extract dependencies
      const projectInfo: ProjectInfo = {
        name: repoInfo.name,
        description: repoInfo.description || undefined,
        language: repoInfo.language || 'Unknown',
        dependencies: [],
        devDependencies: [],
        hasDockerfile: false,
        hasCI: false,
      };

      // Check for common files
      const fileNames = rootContents.map(item => item.name.toLowerCase());
      projectInfo.hasDockerfile = fileNames.includes('dockerfile');
      projectInfo.hasCI = fileNames.includes('.github') || 
                          fileNames.includes('.gitlab-ci.yml') ||
                          fileNames.includes('.travis.yml') ||
                          fileNames.includes('jenkinsfile');

      // Detect CI platform
      if (fileNames.includes('.github')) {
        projectInfo.ciPlatform = 'GitHub Actions';
      } else if (fileNames.includes('.gitlab-ci.yml')) {
        projectInfo.ciPlatform = 'GitLab CI';
      } else if (fileNames.includes('.travis.yml')) {
        projectInfo.ciPlatform = 'Travis CI';
      } else if (fileNames.includes('jenkinsfile')) {
        projectInfo.ciPlatform = 'Jenkins';
      }

      // Analyze based on detected files
      if (fileNames.includes('package.json')) {
        await this.analyzeNodeProject(projectInfo, rootContents);
      } else if (fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml')) {
        await this.analyzePythonProject(projectInfo, rootContents);
      } else if (fileNames.includes('pom.xml') || fileNames.includes('build.gradle')) {
        await this.analyzeJavaProject(projectInfo, rootContents);
      } else if (fileNames.includes('go.mod')) {
        await this.analyzeGoProject(projectInfo, rootContents);
      } else if (fileNames.includes('cargo.toml')) {
        await this.analyzeRustProject(projectInfo, rootContents);
      }

      return projectInfo;
    } catch (error) {
      console.error('Failed to analyze project:', error);
      throw new Error(`Project analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeNodeProject(projectInfo: ProjectInfo, rootContents: GitHubContent[]): Promise<void> {
    try {
      const packageJsonFile = rootContents.find(item => item.name === 'package.json');
      if (!packageJsonFile) return;

      const packageJsonContent = await this.githubClient.getFileContent(
        this.owner,
        this.repo,
        packageJsonFile.path,
        this.ref
      );

      const packageJson = JSON.parse(packageJsonContent);
      
      projectInfo.packageManager = 'npm';
      projectInfo.framework = this.detectNodeFramework(packageJson);

      // Extract dependencies
      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          projectInfo.dependencies.push({
            name,
            version: version as string,
            ecosystem: 'npm',
            isDev: false
          });
        });
      }

      // Extract dev dependencies
      if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          projectInfo.devDependencies.push({
            name,
            version: version as string,
            ecosystem: 'npm',
            isDev: true
          });
        });
      }
    } catch (error) {
      console.error('Failed to analyze Node.js project:', error);
    }
  }

  private async analyzePythonProject(projectInfo: ProjectInfo, rootContents: GitHubContent[]): Promise<void> {
    try {
      projectInfo.packageManager = 'pip';
      projectInfo.framework = 'Python';

      // Try requirements.txt first
      const requirementsFile = rootContents.find(item => item.name === 'requirements.txt');
      if (requirementsFile) {
        const requirementsContent = await this.githubClient.getFileContent(
          this.owner,
          this.repo,
          requirementsFile.path,
          this.ref
        );

        const lines = requirementsContent.split('\n');
        lines.forEach(line => {
          line = line.trim();
          if (line && !line.startsWith('#')) {
            const match = line.match(/^([a-zA-Z0-9_-]+)([=<>!]+)(.+)$/);
            if (match) {
              projectInfo.dependencies.push({
                name: match[1],
                version: match[3],
                ecosystem: 'pypi',
                isDev: false
              });
            }
          }
        });
      }

      // Try pyproject.toml
      const pyprojectFile = rootContents.find(item => item.name === 'pyproject.toml');
      if (pyprojectFile) {
        const pyprojectContent = await this.githubClient.getFileContent(
          this.owner,
          this.repo,
          pyprojectFile.path,
          this.ref
        );

        // Basic TOML parsing for dependencies
        const dependencyMatch = pyprojectContent.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\[|$)/);
        if (dependencyMatch) {
          const depsSection = dependencyMatch[1];
          const depLines = depsSection.split('\n');
          depLines.forEach(line => {
            const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
            if (match && match[1] !== 'python') {
              projectInfo.dependencies.push({
                name: match[1],
                version: match[2],
                ecosystem: 'pypi',
                isDev: false
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to analyze Python project:', error);
    }
  }

  private async analyzeJavaProject(projectInfo: ProjectInfo, rootContents: GitHubContent[]): Promise<void> {
    try {
      const pomFile = rootContents.find(item => item.name === 'pom.xml');
      const gradleFile = rootContents.find(item => item.name === 'build.gradle' || item.name === 'build.gradle.kts');

      if (pomFile) {
        projectInfo.buildTool = 'Maven';
        projectInfo.framework = 'Java/Maven';
        // Maven dependency parsing would require XML parsing
        // For now, we'll just mark it as detected
      } else if (gradleFile) {
        projectInfo.buildTool = 'Gradle';
        projectInfo.framework = 'Java/Gradle';
        // Gradle dependency parsing would require more complex parsing
      }
    } catch (error) {
      console.error('Failed to analyze Java project:', error);
    }
  }

  private async analyzeGoProject(projectInfo: ProjectInfo, rootContents: GitHubContent[]): Promise<void> {
    try {
      const goModFile = rootContents.find(item => item.name === 'go.mod');
      if (!goModFile) return;

      projectInfo.packageManager = 'go';
      projectInfo.framework = 'Go';

      const goModContent = await this.githubClient.getFileContent(
        this.owner,
        this.repo,
        goModFile.path,
        this.ref
      );

      const lines = goModContent.split('\n');
      let inRequireBlock = false;

      lines.forEach(line => {
        line = line.trim();
        
        if (line.startsWith('require (')) {
          inRequireBlock = true;
          return;
        }
        
        if (inRequireBlock && line === ')') {
          inRequireBlock = false;
          return;
        }

        if (inRequireBlock || line.startsWith('require ')) {
          const match = line.match(/^require\s+([^\s]+)\s+([^\s]+)/);
          if (match) {
            projectInfo.dependencies.push({
              name: match[1],
              version: match[2],
              ecosystem: 'go',
              isDev: false
            });
          } else if (inRequireBlock) {
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
              projectInfo.dependencies.push({
                name: parts[0],
                version: parts[1],
                ecosystem: 'go',
                isDev: false
              });
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to analyze Go project:', error);
    }
  }

  private async analyzeRustProject(projectInfo: ProjectInfo, rootContents: GitHubContent[]): Promise<void> {
    try {
      const cargoFile = rootContents.find(item => item.name.toLowerCase() === 'cargo.toml');
      if (!cargoFile) return;

      projectInfo.packageManager = 'cargo';
      projectInfo.framework = 'Rust';

      const cargoContent = await this.githubClient.getFileContent(
        this.owner,
        this.repo,
        cargoFile.path,
        this.ref
      );

      // Basic TOML parsing for dependencies
      const dependencyMatch = cargoContent.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
      if (dependencyMatch) {
        const depsSection = dependencyMatch[1];
        const depLines = depsSection.split('\n');
        depLines.forEach(line => {
          const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
          if (match) {
            projectInfo.dependencies.push({
              name: match[1],
              version: match[2],
              ecosystem: 'crates.io',
              isDev: false
            });
          }
        });
      }

      // Dev dependencies
      const devDependencyMatch = cargoContent.match(/\[dev-dependencies\]([\s\S]*?)(?=\[|$)/);
      if (devDependencyMatch) {
        const depsSection = devDependencyMatch[1];
        const depLines = depsSection.split('\n');
        depLines.forEach(line => {
          const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
          if (match) {
            projectInfo.devDependencies.push({
              name: match[1],
              version: match[2],
              ecosystem: 'crates.io',
              isDev: true
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to analyze Rust project:', error);
    }
  }

  private detectNodeFramework(packageJson: any): string {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps['next']) return 'Next.js';
    if (deps['react']) return 'React';
    if (deps['vue']) return 'Vue.js';
    if (deps['@angular/core']) return 'Angular';
    if (deps['express']) return 'Express';
    if (deps['nestjs']) return 'NestJS';
    if (deps['gatsby']) return 'Gatsby';
    if (deps['nuxt']) return 'Nuxt.js';
    
    return 'Node.js';
  }
}
