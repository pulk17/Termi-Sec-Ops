import { useState, useCallback, useEffect } from 'react';
import { 
  GitHubActionsGenerator, 
  WorkflowTemplate, 
  WorkflowGenerationOptions, 
  GeneratedWorkflow, 
  WorkflowDeploymentResult,
  createGitHubActionsGenerator 
} from '@/lib/github-actions';
import { GitHubWorkflow, GitHubWorkflowRun } from '@/lib/github';
import { ProjectInfo } from '@/lib/project-analyzer';
import { useGitHub } from './useGitHub';
import { toast } from 'sonner';

export interface UseGitHubActionsOptions {
  autoLoadWorkflows?: boolean;
  pollInterval?: number; // For monitoring workflow runs
}

export interface UseGitHubActionsReturn {
  // Generator and templates
  generator: GitHubActionsGenerator | null;
  availableTemplates: WorkflowTemplate[];
  selectedTemplate: WorkflowTemplate | null;
  selectTemplate: (templateName: string) => void;

  // Workflow generation
  isGenerating: boolean;
  generatedWorkflows: GeneratedWorkflow[];
  generateWorkflows: (
    projectInfo: ProjectInfo,
    options: WorkflowGenerationOptions
  ) => Promise<GeneratedWorkflow[]>;
  clearGeneratedWorkflows: () => void;

  // Repository workflows
  repositoryWorkflows: GitHubWorkflow[];
  isLoadingWorkflows: boolean;
  loadRepositoryWorkflows: (owner: string, repo: string) => Promise<void>;

  // Workflow deployment
  isDeploying: boolean;
  deployWorkflow: (
    owner: string,
    repo: string,
    workflow: GeneratedWorkflow,
    commitMessage?: string
  ) => Promise<WorkflowDeploymentResult>;

  // Workflow execution
  isTriggering: boolean;
  triggerWorkflow: (
    owner: string,
    repo: string,
    workflowId: string,
    ref?: string,
    inputs?: Record<string, any>
  ) => Promise<WorkflowDeploymentResult>;

  // Workflow monitoring
  workflowRuns: GitHubWorkflowRun[];
  isLoadingRuns: boolean;
  monitoringRuns: Map<number, boolean>;
  loadWorkflowRuns: (owner: string, repo: string, workflowId?: string) => Promise<void>;
  monitorWorkflowRun: (
    owner: string,
    repo: string,
    runId: number,
    onUpdate?: (run: GitHubWorkflowRun) => void
  ) => Promise<GitHubWorkflowRun>;
  stopMonitoring: (runId: number) => void;

  // Workflow management
  cancelWorkflowRun: (owner: string, repo: string, runId: number) => Promise<void>;
  downloadWorkflowLogs: (owner: string, repo: string, runId: number) => Promise<ArrayBuffer>;

  // Utilities
  exportWorkflow: (workflow: GeneratedWorkflow) => string;
  validateWorkflowYAML: (content: string) => { valid: boolean; errors: string[] };
  error: string | null;
  clearError: () => void;
}

export const useGitHubActions = (
  options: UseGitHubActionsOptions = {}
): UseGitHubActionsReturn => {
  const { autoLoadWorkflows = true, pollInterval = 30000 } = options;
  const { client: githubClient } = useGitHub();

  // State
  const [generator, setGenerator] = useState<GitHubActionsGenerator | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWorkflows, setGeneratedWorkflows] = useState<GeneratedWorkflow[]>([]);
  const [repositoryWorkflows, setRepositoryWorkflows] = useState<GitHubWorkflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [workflowRuns, setWorkflowRuns] = useState<GitHubWorkflowRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [monitoringRuns, setMonitoringRuns] = useState<Map<number, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Initialize generator when GitHub client is available
  useEffect(() => {
    if (githubClient) {
      const actionsGenerator = createGitHubActionsGenerator(githubClient);
      setGenerator(actionsGenerator);
      setAvailableTemplates(actionsGenerator.getAvailableTemplates());
    } else {
      setGenerator(null);
      setAvailableTemplates([]);
    }
  }, [githubClient]);

  // Template selection
  const selectTemplate = useCallback((templateName: string) => {
    if (generator) {
      const template = generator.getTemplate(templateName);
      setSelectedTemplate(template || null);
    }
  }, [generator]);

  // Workflow generation
  const generateWorkflows = useCallback(async (
    projectInfo: ProjectInfo,
    options: WorkflowGenerationOptions
  ): Promise<GeneratedWorkflow[]> => {
    if (!generator) {
      throw new Error('GitHub Actions generator not initialized');
    }

    try {
      setError(null);
      setIsGenerating(true);

      const workflows = await generator.generateWorkflows(projectInfo, options);
      setGeneratedWorkflows(workflows);

      toast.success(`Generated ${workflows.length} workflow${workflows.length !== 1 ? 's' : ''}`);
      return workflows;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate workflows';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;

    } finally {
      setIsGenerating(false);
    }
  }, [generator]);

  const clearGeneratedWorkflows = useCallback(() => {
    setGeneratedWorkflows([]);
  }, []);

  // Repository workflows
  const loadRepositoryWorkflows = useCallback(async (owner: string, repo: string): Promise<void> => {
    if (!githubClient) {
      setError('GitHub client not initialized');
      return;
    }

    try {
      setError(null);
      setIsLoadingWorkflows(true);

      const workflows = await githubClient.getWorkflows(owner, repo);
      setRepositoryWorkflows(workflows);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load workflows';
      setError(errorMessage);
      toast.error(errorMessage);

    } finally {
      setIsLoadingWorkflows(false);
    }
  }, [githubClient]);

  // Workflow deployment
  const deployWorkflow = useCallback(async (
    owner: string,
    repo: string,
    workflow: GeneratedWorkflow,
    commitMessage?: string
  ): Promise<WorkflowDeploymentResult> => {
    if (!generator) {
      throw new Error('GitHub Actions generator not initialized');
    }

    try {
      setError(null);
      setIsDeploying(true);

      const result = await generator.deployWorkflow(owner, repo, workflow, commitMessage);
      
      if (result.success && autoLoadWorkflows) {
        // Reload workflows after successful deployment
        setTimeout(() => loadRepositoryWorkflows(owner, repo), 2000);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to deploy workflow';
      setError(errorMessage);
      throw error;

    } finally {
      setIsDeploying(false);
    }
  }, [generator, autoLoadWorkflows, loadRepositoryWorkflows]);

  // Workflow execution
  const triggerWorkflow = useCallback(async (
    owner: string,
    repo: string,
    workflowId: string,
    ref: string = 'main',
    inputs?: Record<string, any>
  ): Promise<WorkflowDeploymentResult> => {
    if (!generator) {
      throw new Error('GitHub Actions generator not initialized');
    }

    try {
      setError(null);
      setIsTriggering(true);

      const result = await generator.triggerWorkflow(owner, repo, workflowId, ref, inputs);
      
      if (result.success) {
        // Reload workflow runs after triggering
        setTimeout(() => loadWorkflowRuns(owner, repo, workflowId), 2000);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to trigger workflow';
      setError(errorMessage);
      throw error;

    } finally {
      setIsTriggering(false);
    }
  }, [generator]);

  // Workflow monitoring
  const loadWorkflowRuns = useCallback(async (
    owner: string,
    repo: string,
    workflowId?: string
  ): Promise<void> => {
    if (!githubClient) {
      setError('GitHub client not initialized');
      return;
    }

    try {
      setError(null);
      setIsLoadingRuns(true);

      const runs = await githubClient.getWorkflowRuns(owner, repo, workflowId, {
        per_page: 50
      });
      setWorkflowRuns(runs);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load workflow runs';
      setError(errorMessage);
      toast.error(errorMessage);

    } finally {
      setIsLoadingRuns(false);
    }
  }, [githubClient]);

  const monitorWorkflowRun = useCallback(async (
    owner: string,
    repo: string,
    runId: number,
    onUpdate?: (run: GitHubWorkflowRun) => void
  ): Promise<GitHubWorkflowRun> => {
    if (!generator) {
      throw new Error('GitHub Actions generator not initialized');
    }

    try {
      setError(null);
      
      // Mark as monitoring
      setMonitoringRuns(prev => new Map(prev).set(runId, true));

      const result = await generator.monitorWorkflowRun(owner, repo, runId, (run) => {
        // Update the run in our state
        setWorkflowRuns(prev => prev.map(r => r.id === runId ? run : r));
        
        if (onUpdate) {
          onUpdate(run);
        }
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to monitor workflow run';
      setError(errorMessage);
      throw error;

    } finally {
      // Stop monitoring
      setMonitoringRuns(prev => {
        const newMap = new Map(prev);
        newMap.delete(runId);
        return newMap;
      });
    }
  }, [generator]);

  const stopMonitoring = useCallback((runId: number) => {
    setMonitoringRuns(prev => {
      const newMap = new Map(prev);
      newMap.delete(runId);
      return newMap;
    });
  }, []);

  // Workflow management
  const cancelWorkflowRun = useCallback(async (
    owner: string,
    repo: string,
    runId: number
  ): Promise<void> => {
    if (!githubClient) {
      throw new Error('GitHub client not initialized');
    }

    try {
      setError(null);
      
      await githubClient.cancelWorkflowRun(owner, repo, runId);
      
      // Update the run status in our state
      setWorkflowRuns(prev => prev.map(run => 
        run.id === runId 
          ? { ...run, status: 'cancelled' as const, conclusion: 'cancelled' as const }
          : run
      ));

      toast.success('Workflow run cancelled');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel workflow run';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, [githubClient]);

  const downloadWorkflowLogs = useCallback(async (
    owner: string,
    repo: string,
    runId: number
  ): Promise<ArrayBuffer> => {
    if (!githubClient) {
      throw new Error('GitHub client not initialized');
    }

    try {
      setError(null);
      
      const logs = await githubClient.getWorkflowRunLogs(owner, repo, runId);
      
      toast.success('Workflow logs downloaded');
      return logs;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download workflow logs';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, [githubClient]);

  // Utilities
  const exportWorkflow = useCallback((workflow: GeneratedWorkflow): string => {
    return workflow.content;
  }, []);

  const validateWorkflowYAML = useCallback((content: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    try {
      // Basic YAML validation
      if (!content.trim()) {
        errors.push('Workflow content is empty');
        return { valid: false, errors };
      }

      // Check for required fields
      if (!content.includes('name:')) {
        errors.push('Workflow must have a name');
      }

      if (!content.includes('on:')) {
        errors.push('Workflow must have trigger events (on:)');
      }

      if (!content.includes('jobs:')) {
        errors.push('Workflow must have jobs');
      }

      // Check for common issues
      if (content.includes('\t')) {
        errors.push('Use spaces instead of tabs for indentation');
      }

      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.trim() && !line.startsWith(' ') && !line.includes(':') && index > 0) {
          errors.push(`Line ${index + 1}: Possible indentation issue`);
        }
      });

      return { valid: errors.length === 0, errors };

    } catch (error) {
      errors.push('Invalid YAML syntax');
      return { valid: false, errors };
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load workflows when GitHub client changes
  useEffect(() => {
    if (githubClient && autoLoadWorkflows) {
      // Auto-load is handled per repository, not globally
    }
  }, [githubClient, autoLoadWorkflows]);

  return {
    // Generator and templates
    generator,
    availableTemplates,
    selectedTemplate,
    selectTemplate,

    // Workflow generation
    isGenerating,
    generatedWorkflows,
    generateWorkflows,
    clearGeneratedWorkflows,

    // Repository workflows
    repositoryWorkflows,
    isLoadingWorkflows,
    loadRepositoryWorkflows,

    // Workflow deployment
    isDeploying,
    deployWorkflow,

    // Workflow execution
    isTriggering,
    triggerWorkflow,

    // Workflow monitoring
    workflowRuns,
    isLoadingRuns,
    monitoringRuns,
    loadWorkflowRuns,
    monitorWorkflowRun,
    stopMonitoring,

    // Workflow management
    cancelWorkflowRun,
    downloadWorkflowLogs,

    // Utilities
    exportWorkflow,
    validateWorkflowYAML,
    error,
    clearError
  };
};