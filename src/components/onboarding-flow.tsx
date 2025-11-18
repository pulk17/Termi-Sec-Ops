'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSecureTokens, usePrivacyAnalytics } from './security-provider';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Circle, 
  Github, 
  Shield, 
  Zap, 
  BookOpen,
  Play,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
  isCompleted: boolean;
  isOptional?: boolean;
}

interface OnboardingStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onComplete: (data?: any) => void;
  stepData?: any;
}

export function OnboardingFlow() {
  const { storeGitHubToken, storeSnykToken, getGitHubToken, getSnykToken } = useSecureTokens();
  const { trackFeatureUsed } = usePrivacyAnalytics();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to DevSecOps Pipeline',
      description: 'Get started with automated security scanning',
      component: WelcomeStep,
      isCompleted: false
    },
    {
      id: 'github-setup',
      title: 'Connect GitHub',
      description: 'Set up GitHub integration for repository access',
      component: GitHubSetupStep,
      isCompleted: false
    },
    {
      id: 'snyk-setup',
      title: 'Configure Snyk',
      description: 'Enable vulnerability scanning with Snyk',
      component: SnykSetupStep,
      isCompleted: false,
      isOptional: true
    },
    {
      id: 'first-scan',
      title: 'Run Your First Scan',
      description: 'Scan a repository to see the platform in action',
      component: FirstScanStep,
      isCompleted: false
    },
    {
      id: 'completion',
      title: 'You\'re All Set!',
      description: 'Explore advanced features and best practices',
      component: CompletionStep,
      isCompleted: false
    }
  ];

  const [onboardingSteps, setOnboardingSteps] = useState(steps);

  useEffect(() => {
    checkExistingSetup();
    trackFeatureUsed('onboarding_started');
  }, []);

  const checkExistingSetup = async () => {
    try {
      const [githubToken, snykToken] = await Promise.all([
        getGitHubToken(),
        getSnykToken()
      ]);

      setOnboardingSteps(prev => prev.map(step => {
        if (step.id === 'github-setup' && githubToken) {
          return { ...step, isCompleted: true };
        }
        if (step.id === 'snyk-setup' && snykToken) {
          return { ...step, isCompleted: true };
        }
        return step;
      }));
    } catch (error) {
      console.error('Failed to check existing setup:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepComplete = (data?: any) => {
    if (data) {
      setStepData(prev => ({ ...prev, [onboardingSteps[currentStep].id]: data }));
    }

    setOnboardingSteps(prev => prev.map((step, index) => 
      index === currentStep ? { ...step, isCompleted: true } : step
    ));

    if (currentStep === onboardingSteps.length - 1) {
      setIsOnboardingComplete(true);
      trackFeatureUsed('onboarding_completed');
    } else {
      handleNext();
    }
  };

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const CurrentStepComponent = onboardingSteps[currentStep].component;

  if (isOnboardingComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Onboarding Complete!</CardTitle>
            <CardDescription>
              You're ready to start securing your applications
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>
              You've successfully set up the DevSecOps Pipeline. Start by scanning your first repository
              or explore the advanced features.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.href = '/scan'}>
                <Zap className="h-4 w-4 mr-2" />
                Start Scanning
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                <BookOpen className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Getting Started</h1>
          <Badge variant="outline">
            Step {currentStep + 1} of {onboardingSteps.length}
          </Badge>
        </div>
        <Progress value={progress} className="mb-4" />
        
        {/* Step indicators */}
        <div className="flex items-center justify-between">
          {onboardingSteps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                index <= currentStep 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-muted-foreground text-muted-foreground'
              }`}>
                {step.isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              {index < onboardingSteps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {onboardingSteps[currentStep].isOptional && (
              <Badge variant="secondary">Optional</Badge>
            )}
            {onboardingSteps[currentStep].title}
          </CardTitle>
          <CardDescription>
            {onboardingSteps[currentStep].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent
            onNext={handleNext}
            onPrevious={handlePrevious}
            onComplete={handleStepComplete}
            stepData={stepData[onboardingSteps[currentStep].id]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Individual step components
function WelcomeStep({ onComplete }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-10 w-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Welcome to DevSecOps Pipeline</h2>
        <p className="text-muted-foreground mb-6">
          A comprehensive security scanning platform that helps you identify and fix vulnerabilities 
          in your applications before they reach production.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 border rounded-lg">
          <Github className="h-8 w-8 mx-auto mb-2 text-gray-700" />
          <h3 className="font-medium mb-1">GitHub Integration</h3>
          <p className="text-sm text-muted-foreground">
            Connect your repositories for automated scanning
          </p>
        </div>
        <div className="text-center p-4 border rounded-lg">
          <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
          <h3 className="font-medium mb-1">Security Scanning</h3>
          <p className="text-sm text-muted-foreground">
            Multiple vulnerability databases and tools
          </p>
        </div>
        <div className="text-center p-4 border rounded-lg">
          <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
          <h3 className="font-medium mb-1">Automated Reports</h3>
          <p className="text-sm text-muted-foreground">
            Detailed reports with actionable insights
          </p>
        </div>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Privacy First:</strong> All data is processed locally in your browser. 
          No sensitive information is sent to external servers.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={() => onComplete()}>
          Get Started
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function GitHubSetupStep({ onNext, onPrevious, onComplete }: OnboardingStepProps) {
  const { storeGitHubToken } = useSecureTokens();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleSave = async () => {
    if (!token.trim()) {
      setError('Please enter a GitHub token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await storeGitHubToken(token);
      onComplete({ token });
    } catch (err) {
      setError('Failed to save GitHub token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Connect Your GitHub Account</h3>
        <p className="text-muted-foreground mb-4">
          To scan your repositories, we need a GitHub Personal Access Token. This token is stored 
          securely in your browser and never sent to external servers.
        </p>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-medium mb-2">How to create a GitHub Personal Access Token:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
          <li>Click "Generate new token (classic)"</li>
          <li>Select scopes: <code className="bg-background px-1 rounded">repo</code>, <code className="bg-background px-1 rounded">workflow</code></li>
          <li>Copy the generated token</li>
        </ol>
        <div className="mt-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('https://github.com/settings/tokens/new', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Create Token
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="github-token">GitHub Personal Access Token</Label>
        <div className="flex gap-2">
          <Input
            id="github-token"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? "Hide" : "Show"}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your token is encrypted and stored locally. It's never transmitted to external servers 
          except when making authorized GitHub API calls.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onNext}>
            Skip for Now
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save & Continue"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SnykSetupStep({ onNext, onPrevious, onComplete }: OnboardingStepProps) {
  const { storeSnykToken } = useSecureTokens();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleSave = async () => {
    if (!token.trim()) {
      setError('Please enter a Snyk token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await storeSnykToken(token);
      onComplete({ token });
    } catch (err) {
      setError('Failed to save Snyk token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Configure Snyk Security Scanning</h3>
        <p className="text-muted-foreground mb-4">
          Snyk provides comprehensive vulnerability scanning for your dependencies. 
          This step is optional but recommended for enhanced security coverage.
        </p>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-medium mb-2">How to get your Snyk API token:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Sign up for a free account at <a href="https://snyk.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">snyk.io</a></li>
          <li>Go to Account Settings → API Token</li>
          <li>Copy your API token</li>
        </ol>
        <div className="mt-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('https://app.snyk.io/account', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Get Snyk Token
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="snyk-token">Snyk API Token</Label>
        <div className="flex gap-2">
          <Input
            id="snyk-token"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? "Hide" : "Show"}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onNext}>
            Skip for Now
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save & Continue"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FirstScanStep({ onNext, onPrevious, onComplete }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Ready to Run Your First Scan</h3>
        <p className="text-muted-foreground mb-4">
          Now that you've configured your integrations, let's run your first security scan 
          to see the platform in action.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Scan</CardTitle>
            <CardDescription>
              Scan a public repository to test the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              onClick={() => {
                window.location.href = '/scan?demo=true';
                onComplete();
              }}
            >
              <Play className="h-4 w-4 mr-2" />
              Try Demo Scan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scan Your Repository</CardTitle>
            <CardDescription>
              Scan one of your own repositories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                window.location.href = '/scan';
                onComplete();
              }}
            >
              <Github className="h-4 w-4 mr-2" />
              Choose Repository
            </Button>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Don't worry - you can always run scans later. The demo scan will show you 
          how the platform works without requiring any setup.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button variant="outline" onClick={() => onComplete()}>
          Skip for Now
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function CompletionStep({ onComplete }: OnboardingStepProps) {
  const resources = [
    {
      title: 'User Guide',
      description: 'Complete guide to using all features',
      href: '/docs/user-guide',
      icon: BookOpen
    },
    {
      title: 'Security Best Practices',
      description: 'Learn how to secure your applications',
      href: '/docs/security',
      icon: Shield
    },
    {
      title: 'API Documentation',
      description: 'Integrate with external tools and services',
      href: '/docs/api',
      icon: Zap
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Setup Complete!</h3>
        <p className="text-muted-foreground">
          You're ready to start securing your applications. Here are some resources to help you get the most out of the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <Card key={resource.title} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <resource.icon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <CardTitle className="text-lg">{resource.title}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(resource.href, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Resource
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button onClick={() => onComplete()} size="lg">
          <Zap className="h-4 w-4 mr-2" />
          Start Using DevSecOps Pipeline
        </Button>
      </div>
    </div>
  );
}