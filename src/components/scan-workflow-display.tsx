"use client";

import { CheckCircle, Loader2, Circle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface WorkflowStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

interface ScanWorkflowDisplayProps {
  steps: WorkflowStep[];
}

export function ScanWorkflowDisplay({ steps }: ScanWorkflowDisplayProps) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-6">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {step.status === 'completed' && (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                )}
                {step.status === 'running' && (
                  <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                )}
                {step.status === 'error' && (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
                {step.status === 'pending' && (
                  <Circle className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-mono ${
                    step.status === 'completed' ? 'text-green-400' :
                    step.status === 'running' ? 'text-blue-400' :
                    step.status === 'error' ? 'text-red-400' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {step.message && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    {step.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
