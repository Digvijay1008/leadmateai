'use client';

import React, { useState, useEffect } from 'react';
import { WidgetConfig, WidgetTheme, WidgetPosition, DEFAULT_WIDGET_CONFIG } from '@/types/widget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WidgetPreview } from '@/components/widget/WidgetPreview';
import { WidgetSettings } from '@/components/widget/WidgetSettings';
import { WidgetEmbedCode } from '@/components/widget/WidgetEmbedCode';
import { useAgentConfigQuery } from '@/features/telephony/hooks';

export default function WidgetBuilderPage() {
  const [config, setConfig] = useState<Partial<WidgetConfig>>({
    ...DEFAULT_WIDGET_CONFIG,
    agentId: '',
    agentName: '',
    isEnabled: true,
    allowedDomains: [],
  });
  const [activeTab, setActiveTab] = useState('preview');

  // Fetch the real agent config from the API
  const { data: agentConfig, isLoading: agentsLoading } = useAgentConfigQuery();

  // Derive an agent list from the API response
  const agents = agentConfig
    ? [{ id: 'agent-default', name: agentConfig.greeting_message ? 'Your AI Agent' : 'AI Agent', status: 'active' }]
    : [];

  // Auto-select the only agent when loaded
  useEffect(() => {
    if (agents.length === 1 && !config.agentId) {
      setConfig((prev) => ({ ...prev, agentId: agents[0].id, agentName: agents[0].name }));
    }
  }, [agents.length]);

  const updateConfig = (updates: Partial<WidgetConfig>) =>
    setConfig((prev) => ({ ...prev, ...updates }));

  const updateTheme = (updates: Partial<WidgetTheme>) =>
    setConfig((prev) => ({
      ...prev,
      theme: { ...(prev.theme ?? DEFAULT_WIDGET_CONFIG.theme), ...updates },
    }));

  const updatePosition = (updates: Partial<WidgetPosition>) =>
    setConfig((prev) => ({
      ...prev,
      position: { ...(prev.position ?? DEFAULT_WIDGET_CONFIG.position), ...updates },
    }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white font-headline">
            Voice Widget Builder
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Customize and embed your AI voice assistant on any website
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={config.isEnabled ? 'default' : 'secondary'}
            className={config.isEnabled ? 'bg-emerald-500' : ''}
          >
            {config.isEnabled ? 'Widget Active' : 'Widget Disabled'}
          </Badge>
          <Button
            onClick={() => updateConfig({ isEnabled: !config.isEnabled })}
            className={config.isEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}
          >
            {config.isEnabled ? 'Disable Widget' : 'Enable Widget'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="install">Install</TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <WidgetPreview config={config} onPositionChange={updatePosition} />

            {/* Quick Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Quick Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Agent picker in preview */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Select Agent
                  </label>
                  {agentsLoading ? (
                    <p className="text-sm text-slate-400 animate-pulse">Loading agents...</p>
                  ) : (
                    <select
                      value={config.agentId ?? ''}
                      onChange={(e) => updateConfig({ agentId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                    >
                      <option value="">Choose an agent...</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Widget size */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Widget Size
                  </label>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => updatePosition({ size })}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                          config.position?.size === size
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <WidgetSettings
            config={config}
            agents={agents}
            agentsLoading={agentsLoading}
            onConfigChange={updateConfig}
          />
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Colors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Primary Color
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={config.theme?.primaryColor ?? '#6366f1'}
                      onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      value={config.theme?.primaryColor ?? '#6366f1'}
                      onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Background Color
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={config.theme?.backgroundColor ?? '#ffffff'}
                      onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      value={config.theme?.backgroundColor ?? '#ffffff'}
                      onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Border Radius — {config.theme?.borderRadius ?? 24}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="48"
                    value={config.theme?.borderRadius ?? 24}
                    onChange={(e) => updateTheme({ borderRadius: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Accent Style
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['gradient', 'solid', 'glass'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => updateTheme({ accentStyle: style })}
                        className={`p-4 rounded-xl text-sm font-medium capitalize transition-all ${
                          config.theme?.accentStyle === style
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mini preview */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Preview</h4>
                  <div className="flex gap-4 justify-center">
                    <div
                      className="w-16 h-16 flex items-center justify-center text-white font-bold"
                      style={{
                        backgroundColor: config.theme?.primaryColor ?? '#6366f1',
                        borderRadius: `${config.theme?.borderRadius ?? 24}px`,
                      }}
                    >
                      <span className="material-symbols-outlined">call</span>
                    </div>
                    <div
                      className="p-4 shadow-lg"
                      style={{
                        backgroundColor: config.theme?.backgroundColor ?? '#ffffff',
                        borderRadius: config.theme?.borderRadius ?? 24,
                      }}
                    >
                      <p className="text-sm font-bold" style={{ color: config.theme?.textColor ?? '#1e293b' }}>
                        Widget Panel
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Install Tab */}
        <TabsContent value="install" className="space-y-6">
          <WidgetEmbedCode config={config} />
        </TabsContent>
      </Tabs>
    </div>
  );
}