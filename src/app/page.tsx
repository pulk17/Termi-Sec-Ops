'use client';

import { useState } from 'react';

import { Shield, Github, Zap, BarChart3, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const features = [
  {
    icon: Shield,
    title: 'Multi-Scanner Security Analysis',
    description: 'Comprehensive vulnerability scanning using Snyk, OSV, and language-specific tools',
    color: 'text-red-500',
  },
  {
    icon: Github,
    title: 'GitHub Integration',
    description: 'Seamless integration with GitHub repositories, both public and private',
    color: 'text-gray-900 dark:text-gray-100',
  },
  {
    icon: Zap,
    title: 'Real-time Scanning',
    description: 'Live progress tracking and instant results with GitHub Actions integration',
    color: 'text-yellow-500',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Detailed vulnerability reports, trends, and security score tracking',
    color: 'text-blue-500',
  },
  {
    icon: Lock,
    title: 'Client-side Security',
    description: 'All data processed locally with encrypted storage and secure token management',
    color: 'text-green-500',
  },
  {
    icon: Globe,
    title: 'Easy Deployment',
    description: 'Static site deployment to Vercel, Netlify, or GitHub Pages with zero configuration',
    color: 'text-purple-500',
  },
];

const stats = [
  { label: 'Vulnerability Sources', value: '10+' },
  { label: 'Supported Languages', value: '8+' },
  { label: 'Security Checks', value: '50+' },
  { label: 'Report Formats', value: '4' },
];

export default function HomePage() {

  return (
    <div className="min-h-screen bg-black terminal-scanline">
      {/* Navigation */}
      <nav className="border-b border-green-700 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-green-400 terminal-glow" />
            <span className="text-xl font-bold font-mono text-green-400 terminal-glow">DevSecOps Pipeline</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="font-mono text-green-400 hover:text-green-300 hover:bg-green-900/20">
                Dashboard
              </Button>
            </Link>
            <Link href="/scan">
              <Button className="font-mono bg-green-700 hover:bg-green-600 text-black">
                Start Scanning
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div>
          <Badge variant="secondary" className="mb-4 font-mono bg-green-900/30 text-green-400 border-green-700">
            $ ./security-scanner --mode=frontend --backend=none
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold font-mono mb-6 text-green-400 terminal-glow">
            &gt; Secure Your Code
            <br />
            &gt; Before It Ships
          </h1>
          <p className="text-xl text-green-300 mb-8 max-w-2xl mx-auto font-mono">
            Comprehensive security scanning and vulnerability analysis for your GitHub repositories. 
            Powered by Snyk, OSV, Trivy, and advanced static analysis tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/scan">
              <Button size="lg" className="text-lg px-8 font-mono bg-green-700 hover:bg-green-600 text-black">
                <Shield className="mr-2 h-5 w-5" />
                $ start_scan
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-lg px-8 font-mono border-green-700 text-green-400 hover:bg-green-900/20">
                <BarChart3 className="mr-2 h-5 w-5" />
                $ view_dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center p-6 border border-green-700 rounded bg-green-900/10"
            >
              <div className="text-3xl md:text-4xl font-bold font-mono text-green-400 terminal-glow mb-2">
                {stat.value}
              </div>
              <div className="text-sm font-mono text-green-300">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-mono text-green-400 terminal-glow mb-4">
            &gt; System Features
          </h2>
          <p className="text-xl font-mono text-green-300 max-w-2xl mx-auto">
            Comprehensive security scanning with modern tools and real-time insights
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
            >
              <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105 bg-black border-green-700 hover:border-green-500">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                    <CardTitle className="text-xl font-mono text-green-400">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base font-mono text-green-300">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-green-900/10 border-green-700">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-mono text-green-400 terminal-glow mb-4">
              &gt; Ready to Secure Your Code?
            </h2>
            <p className="text-xl font-mono text-green-300 mb-8 max-w-2xl mx-auto">
              Start scanning your repositories today. No signup required, no backend needed.
              Just paste your GitHub URL and get comprehensive security insights.
            </p>
            <Link href="/scan">
              <Button size="lg" className="text-lg px-12 font-mono bg-green-700 hover:bg-green-600 text-black">
                <Shield className="mr-2 h-5 w-5" />
                $ init_first_scan
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-green-700 bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="h-6 w-6 text-green-400" />
              <span className="font-semibold font-mono text-green-400">DevSecOps Pipeline</span>
            </div>
            <div className="text-sm font-mono text-green-300">
              Built with Next.js 15 • Powered by Snyk, OSV & Trivy • Open Source
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}