'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  BookOpen, 
  HelpCircle, 
  ExternalLink, 
  ChevronRight,
  Play,
  FileText,
  Video,
  MessageCircle,
  Lightbulb,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  steps: TutorialStep[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  action?: string;
  tip?: string;
}

export function HelpSystem() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredArticles, setFilteredArticles] = useState<HelpArticle[]>([]);
  const [filteredFAQs, setFilteredFAQs] = useState<FAQ[]>([]);

  const helpArticles: HelpArticle[] = [
    {
      id: 'getting-started',
      title: 'Getting Started with DevSecOps Pipeline',
      description: 'Learn the basics of setting up and using the platform',
      category: 'Getting Started',
      tags: ['setup', 'basics', 'onboarding'],
      difficulty: 'beginner',
      estimatedTime: '10 minutes',
      content: `
# Getting Started with DevSecOps Pipeline

Welcome to DevSecOps Pipeline! This guide will help you get up and running quickly.

## What is DevSecOps Pipeline?

DevSecOps Pipeline is a comprehensive security scanning platform that helps you identify and fix vulnerabilities in your applications before they reach production. It integrates with popular tools and services to provide a unified security dashboard.

## Key Features

- **GitHub Integration**: Connect your repositories for automated scanning
- **Multiple Scanners**: Snyk, OSV, npm audit, and more
- **Real-time Results**: Get instant feedback on security issues
- **Privacy-focused**: All processing happens in your browser
- **Comprehensive Reports**: Detailed vulnerability reports with remediation guidance

## Quick Setup

1. **Connect GitHub**: Add your Personal Access Token
2. **Configure Scanners**: Set up Snyk and other security tools
3. **Run Your First Scan**: Select a repository and start scanning
4. **Review Results**: Analyze vulnerabilities and plan fixes

## Next Steps

- Explore the dashboard to understand your security posture
- Set up automated scanning workflows
- Configure notifications for new vulnerabilities
- Learn about security best practices
      `
    },
    {
      id: 'github-integration',
      title: 'GitHub Integration Setup',
      description: 'How to connect your GitHub repositories',
      category: 'Integration',
      tags: ['github', 'setup', 'repositories'],
      difficulty: 'beginner',
      estimatedTime: '5 minutes',
      content: `
# GitHub Integration Setup

Learn how to securely connect your GitHub repositories to the DevSecOps Pipeline.

## Creating a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Give your token a descriptive name
4. Select the following scopes:
   - \`repo\` - Full control of private repositories
   - \`workflow\` - Update GitHub Action workflows
   - \`read:org\` - Read organization membership

## Adding the Token

1. Navigate to Settings → Security Settings
2. Click on the "API Tokens" tab
3. Enter your GitHub token in the secure field
4. Click "Save Token"

## Security Notes

- Your token is encrypted and stored locally in your browser
- The token is never sent to external servers except for GitHub API calls
- You can revoke the token at any time from GitHub settings
- The platform uses minimal permissions required for functionality

## Troubleshooting

**Token not working?**
- Verify the token has the correct scopes
- Check that the token hasn't expired
- Ensure you're using a "classic" personal access token

**Can't access private repositories?**
- Make sure the \`repo\` scope is selected
- Verify you have access to the repository
- Check organization settings if applicable
      `
    },
    {
      id: 'vulnerability-scanning',
      title: 'Understanding Vulnerability Scanning',
      description: 'Learn about different types of security scans and their results',
      category: 'Security',
      tags: ['scanning', 'vulnerabilities', 'security'],
      difficulty: 'intermediate',
      estimatedTime: '15 minutes',
      content: `
# Understanding Vulnerability Scanning

This guide explains the different types of security scans and how to interpret their results.

## Types of Scans

### Dependency Scanning
Checks your project dependencies for known vulnerabilities:
- **npm audit**: For Node.js projects
- **Snyk**: Comprehensive dependency scanning
- **OSV**: Open Source Vulnerabilities database

### Static Code Analysis
Analyzes your source code for security issues:
- **CodeQL**: GitHub's semantic code analysis
- **Custom rules**: Project-specific security patterns

### Container Scanning
Scans Docker images and containers:
- **Base image vulnerabilities**: Known issues in base images
- **Package vulnerabilities**: Issues in installed packages
- **Configuration issues**: Insecure container configurations

## Severity Levels

### Critical
- Immediate action required
- Can lead to complete system compromise
- Often remotely exploitable

### High
- Should be fixed as soon as possible
- Significant security impact
- May allow unauthorized access

### Medium
- Should be addressed in next release cycle
- Moderate security impact
- May require specific conditions to exploit

### Low
- Can be addressed when convenient
- Minor security impact
- Usually requires local access or specific conditions

## Interpreting Results

### CVSS Scores
Common Vulnerability Scoring System (CVSS) provides standardized severity ratings:
- **9.0-10.0**: Critical
- **7.0-8.9**: High
- **4.0-6.9**: Medium
- **0.1-3.9**: Low

### False Positives
Not all reported vulnerabilities affect your application:
- Check if the vulnerable code path is actually used
- Verify if your usage pattern is affected
- Consider the attack vector and your environment

## Best Practices

1. **Regular Scanning**: Run scans on every commit
2. **Prioritize Fixes**: Focus on critical and high severity issues first
3. **Update Dependencies**: Keep dependencies up to date
4. **Monitor New Vulnerabilities**: Set up alerts for new issues
5. **Document Exceptions**: Record why certain vulnerabilities are accepted
      `
    }
  ];

  const faqs: FAQ[] = [
    {
      id: 'data-privacy',
      question: 'Is my code and data secure?',
      answer: 'Yes! All processing happens locally in your browser. Your code is never sent to external servers except for authorized API calls to GitHub, Snyk, and other configured services. All sensitive data is encrypted before being stored locally.',
      category: 'Privacy & Security',
      helpful: 45
    },
    {
      id: 'supported-languages',
      question: 'What programming languages are supported?',
      answer: 'The platform supports all major programming languages including JavaScript/Node.js, Python, Java, Go, Ruby, PHP, C#/.NET, and more. Language support depends on the specific scanners configured.',
      category: 'Features',
      helpful: 32
    },
    {
      id: 'cost',
      question: 'Is this service free to use?',
      answer: 'The core platform is completely free and open source. However, some integrated services like Snyk may have their own pricing models for advanced features. You can use the platform with free tiers of these services.',
      category: 'Pricing',
      helpful: 28
    },
    {
      id: 'offline-usage',
      question: 'Can I use this offline?',
      answer: 'Partially. The platform includes a service worker for offline functionality, but scanning requires internet access to fetch vulnerability databases and make API calls to integrated services.',
      category: 'Technical',
      helpful: 19
    },
    {
      id: 'enterprise-features',
      question: 'Are there enterprise features available?',
      answer: 'The platform is designed to be self-hosted and can be deployed in enterprise environments. All features are available in the open source version, with no premium tiers or locked features.',
      category: 'Enterprise',
      helpful: 15
    }
  ];

  const tutorials: Tutorial[] = [
    {
      id: 'first-scan',
      title: 'Running Your First Security Scan',
      description: 'Step-by-step guide to scanning your first repository',
      duration: '10 minutes',
      difficulty: 'beginner',
      steps: [
        {
          id: 'step-1',
          title: 'Navigate to Scan Page',
          content: 'Click on the "Scan" tab in the main navigation or use the "New Scan" button on the dashboard.',
          action: 'Go to /scan',
          tip: 'You can also use Ctrl+N to quickly start a new scan'
        },
        {
          id: 'step-2',
          title: 'Select Repository',
          content: 'Choose a repository from your GitHub account or enter a public repository URL.',
          tip: 'Start with a small repository for your first scan to see results quickly'
        },
        {
          id: 'step-3',
          title: 'Configure Scan Options',
          content: 'Select which scanners to run and configure any specific options.',
          tip: 'Enable all available scanners for comprehensive coverage'
        },
        {
          id: 'step-4',
          title: 'Start Scan',
          content: 'Click "Start Scan" and monitor the progress in real-time.',
          tip: 'The scan will continue even if you navigate to other pages'
        },
        {
          id: 'step-5',
          title: 'Review Results',
          content: 'Once complete, review the vulnerability report and prioritize fixes.',
          tip: 'Focus on critical and high severity vulnerabilities first'
        }
      ]
    }
  ];

  useEffect(() => {
    filterContent();
  }, [searchQuery, selectedCategory]);

  const filterContent = () => {
    let articles = helpArticles;
    let faqsFiltered = [] as any[];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query) ||
        article.tags.some(tag => tag.toLowerCase().includes(query)) ||
        article.content.toLowerCase().includes(query)
      );
      
      faqsFiltered = faqsFiltered.filter((faq: any) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      articles = articles.filter(article => article.category === selectedCategory);
      faqsFiltered = faqsFiltered.filter((faq: any) => faq.category === selectedCategory);
    }

    setFilteredArticles(articles);
    setFilteredFAQs(faqsFiltered);
  };

  const categories = ['all', ...Array.from(new Set(helpArticles.map(article => article.category)))];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Help & Documentation</h1>
        <p className="text-muted-foreground">
          Find answers, learn best practices, and get the most out of DevSecOps Pipeline
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documentation, FAQs, and tutorials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? 'All Categories' : category}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="articles">
            <BookOpen className="h-4 w-4 mr-2" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="faqs">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="tutorials">
            <Play className="h-4 w-4 mr-2" />
            Tutorials
          </TabsTrigger>
          <TabsTrigger value="resources">
            <ExternalLink className="h-4 w-4 mr-2" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          {filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No articles found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or category filter
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredArticles.map(article => (
                <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{article.title}</CardTitle>
                      <Badge className={getDifficultyColor(article.difficulty)}>
                        {article.difficulty}
                      </Badge>
                    </div>
                    <CardDescription>{article.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span>{article.estimatedTime}</span>
                      <span>{article.category}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {article.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full">
                      Read Article
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No FAQs found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or category filter
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredFAQs.map(faq => (
                <Card key={faq.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-start gap-2">
                      <HelpCircle className="h-5 w-5 mt-0.5 text-blue-600 flex-shrink-0" />
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{faq.answer}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{faq.category}</Badge>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4" />
                        {faq.helpful} people found this helpful
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tutorials" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tutorials.map(tutorial => (
              <Card key={tutorial.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                    <Badge className={getDifficultyColor(tutorial.difficulty)}>
                      {tutorial.difficulty}
                    </Badge>
                  </div>
                  <CardDescription>{tutorial.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>{tutorial.duration}</span>
                    <span>{tutorial.steps.length} steps</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {tutorial.steps.slice(0, 3).map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <span>{step.title}</span>
                      </div>
                    ))}
                    {tutorial.steps.length > 3 && (
                      <div className="text-sm text-muted-foreground ml-8">
                        +{tutorial.steps.length - 3} more steps
                      </div>
                    )}
                  </div>
                  <Button className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Start Tutorial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <FileText className="h-8 w-8 mb-2 text-blue-600" />
                <CardTitle>API Documentation</CardTitle>
                <CardDescription>
                  Complete API reference and integration guides
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View API Docs
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Video className="h-8 w-8 mb-2 text-green-600" />
                <CardTitle>Video Tutorials</CardTitle>
                <CardDescription>
                  Step-by-step video guides and walkthroughs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Watch Videos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MessageCircle className="h-8 w-8 mb-2 text-purple-600" />
                <CardTitle>Community Forum</CardTitle>
                <CardDescription>
                  Get help from the community and share knowledge
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Join Forum
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Lightbulb className="h-8 w-8 mb-2 text-yellow-600" />
                <CardTitle>Best Practices</CardTitle>
                <CardDescription>
                  Security best practices and implementation guides
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Learn More
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <AlertCircle className="h-8 w-8 mb-2 text-red-600" />
                <CardTitle>Troubleshooting</CardTitle>
                <CardDescription>
                  Common issues and their solutions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Get Help
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="h-8 w-8 mb-2 text-indigo-600" />
                <CardTitle>Changelog</CardTitle>
                <CardDescription>
                  Latest updates and feature releases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Changes
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}