'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAgentConfigQuery,
  useUpdateAgentConfig,
  useVoicesQuery,
  useLLMsQuery,
} from '@/features/telephony/hooks';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import type { AgentConfig } from '@/features/telephony/types';

import { TabBar } from './components/shared';
import { IdentityTab } from './components/IdentityTab';
import { BrainTab } from './components/BrainTab';
import { VoiceTab } from './components/VoiceTab';
import { ToolsTab } from './components/ToolsTab';
import { CallBehaviorTab } from './components/CallBehaviorTab';
import { RuntimePanel } from './components/RuntimePanel';

// ─── Tab definitions ──────────────────────────────────────────────────────────
type Tab = 'identity' | 'brain' | 'voice' | 'tools' | 'behavior';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'identity', label: 'Identity', icon: 'badge' },
  { id: 'brain',    label: 'Brain',    icon: 'psychology' },
  { id: 'voice',    label: 'Voice',    icon: 'record_voice_over' },
  { id: 'tools',    label: 'Tools',    icon: 'build' },
  { id: 'behavior', label: 'Behavior', icon: 'tune' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AgentBuilderPage() {
  const router = useRouter();
  const { data: rawConfig, isLoading, error, refetch } = useAgentConfigQuery();
  const { data: voices = [], isLoading: voicesLoading } = useVoicesQuery();
  const { data: llms = [], isLoading: llmsLoading } = useLLMsQuery();
  const updateMutation = useUpdateAgentConfig();

  const [activeTab, setActiveTab] = useState<Tab>('identity');
  const [formData, setFormData] = useState<Partial<AgentConfig>>({});
  const [saved, setSaved] = useState(false);

  // Hydrate local form from fetched config
  useEffect(() => {
    if (!rawConfig) return;
    setFormData(rawConfig as Partial<AgentConfig>);
  }, [rawConfig]);

  const handleChange = (updates: Partial<AgentConfig>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setSaved(false);
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync(formData as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = () => {
    router.push('/dashboard/dialer');
  };

  if (isLoading) return <LoadingState message="Loading agent configuration…" />;
  if (error)     return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">Agent Builder</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure, tune, and deploy your AI voice agent.
          </p>
        </div>
        {/* Agent name badge */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-500 text-[16px]">smart_toy</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formData.agent_name || 'Unnamed Agent'}
            </p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] text-slate-400">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main 3-column layout ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Center: Builder ── */}
        <div className="flex-1 flex flex-col min-w-0 gap-3">
          {/* Tab bar */}
          <div className="shrink-0">
            <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            {activeTab === 'identity' && (
              <IdentityTab config={formData} onChange={handleChange} />
            )}
            {activeTab === 'brain' && (
              <BrainTab
                config={formData}
                llms={llms}
                llmsLoading={llmsLoading}
                onChange={handleChange}
              />
            )}
            {activeTab === 'voice' && (
              <VoiceTab
                config={formData}
                voices={voices}
                voicesLoading={voicesLoading}
                onChange={handleChange}
              />
            )}
            {activeTab === 'tools' && (
              <ToolsTab config={formData} onChange={handleChange} />
            )}
            {activeTab === 'behavior' && (
              <CallBehaviorTab config={formData} onChange={handleChange} />
            )}
          </div>
        </div>

        {/* ── Right: Runtime Panel ── */}
        <div className="w-56 shrink-0 overflow-y-auto">
          <RuntimePanel
            config={formData}
            voices={voices}
            llms={llms}
            isSaving={updateMutation.isPending}
            saved={saved}
            onSave={handleSave}
            onTest={handleTest}
          />
        </div>
      </div>
    </div>
  );
}
