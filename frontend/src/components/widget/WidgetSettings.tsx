'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WidgetConfig } from '@/types/widget';
import { LoadingState } from '@/components/ui/loading-state';

interface Agent {
  id: string;
  name: string;
  status?: string;
}

interface WidgetSettingsProps {
  config: Partial<WidgetConfig>;
  agents: Agent[];
  agentsLoading: boolean;
  onConfigChange: (updates: Partial<WidgetConfig>) => void;
}

export function WidgetSettings({ config, agents, agentsLoading, onConfigChange }: WidgetSettingsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Agent + Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Agent Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Agent Selection
            </label>
            {agentsLoading ? (
              <LoadingState message="Loading agents..." />
            ) : (
              <select
                value={config.agentId ?? ''}
                onChange={(e) => onConfigChange({ agentId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
              >
                <option value="">Choose an agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} {agent.status ? `(${agent.status})` : ''}
                  </option>
                ))}
              </select>
            )}
            {!agentsLoading && agents.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">
                No agents configured yet. Visit the{' '}
                <a href="/dashboard/agent" className="underline font-semibold">Agent page</a>{' '}
                to set one up.
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Select which AI agent will handle voice conversations
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Welcome Message
            </label>
            <textarea
              value={config.welcomeMessage ?? ''}
              onChange={(e) => onConfigChange({ welcomeMessage: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium resize-none"
              placeholder="Hello! How can I help you today?"
            />
            <p className="text-xs text-slate-500 mt-2">Initial message displayed when widget opens</p>
          </div>
        </CardContent>
      </Card>

      {/* Domain Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Domain Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Allowed Domains
            </label>
            <Input
              value={config.allowedDomains?.join(', ') ?? ''}
              onChange={(e) =>
                onConfigChange({
                  allowedDomains: e.target.value
                    .split(',')
                    .map((d) => d.trim())
                    .filter(Boolean),
                })
              }
              placeholder="example.com, mysite.com"
            />
            <p className="text-xs text-slate-500 mt-2">
              Comma-separated list of domains where widget can appear
            </p>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600">warning</span>
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Security Notice</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Domain restriction ensures your widget is only used on approved websites
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
