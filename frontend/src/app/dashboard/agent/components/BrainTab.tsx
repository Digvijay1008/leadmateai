'use client';

import React from 'react';
import { Section, Field, inputCls, ProviderBadge } from './shared';
import { AgentConfig } from '@/features/telephony/types';
import { LLMOption } from '@/features/telephony/api';

interface Props {
  config: Partial<AgentConfig>;
  llms: LLMOption[];
  llmsLoading: boolean;
  onChange: (updates: Partial<AgentConfig>) => void;
}

const LLM_PROVIDERS = ['openai', 'anthropic', 'google', 'groq'];

export function BrainTab({ config, llms, llmsLoading, onChange }: Props) {
  const filteredByProvider = config.llm_provider
    ? llms.filter(m => m.provider === config.llm_provider)
    : llms;

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <Section
        title="LLM Provider"
        description="Choose the AI model that powers your agent's reasoning."
      >
        <div className="grid grid-cols-2 gap-2">
          {LLM_PROVIDERS.map(p => {
            const isActive = config.llm_provider === p;
            const modelsForProvider = llms.filter(m => m.provider === p);
            return (
              <button
                key={p}
                onClick={() => onChange({ llm_provider: p, llm_model: modelsForProvider[0]?.id })}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base font-black ${
                  isActive ? 'bg-indigo-100 dark:bg-indigo-800/40 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {p === 'openai' ? '⚡' : p === 'anthropic' ? '🔶' : p === 'google' ? '🔷' : '🟣'}
                </div>
                <div>
                  <p className={`text-xs font-bold capitalize ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : p === 'google' ? 'Google' : 'Groq'}
                  </p>
                  <p className="text-[10px] text-slate-400">{modelsForProvider.length} model{modelsForProvider.length !== 1 ? 's' : ''}</p>
                </div>
                {isActive && (
                  <span className="ml-auto material-symbols-outlined text-indigo-500 text-[16px]">check_circle</span>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Model Selection */}
      <Section title="Model" description="Select the specific model version.">
        {llmsLoading ? (
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ) : (
          <div className="space-y-1.5">
            {filteredByProvider.map(model => {
              const isActive = config.llm_model === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => onChange({ llm_model: model.id, llm_provider: model.provider })}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                    isActive
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {model.name}
                      </span>
                      <ProviderBadge provider={model.provider} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {(model.context_window / 1000).toFixed(0)}K context window
                    </p>
                  </div>
                  {isActive && <span className="material-symbols-outlined text-indigo-500 text-[16px]">check_circle</span>}
                </button>
              );
            })}
            {filteredByProvider.length === 0 && !llmsLoading && (
              <p className="text-xs text-slate-400 text-center py-4">Select a provider above to see available models.</p>
            )}
          </div>
        )}
      </Section>

      {/* System Prompt */}
      <Section title="System Prompt" description="The core instruction set for your agent's behavior.">
        <Field label="Prompt" required>
          <textarea
            value={config.system_prompt ?? ''}
            onChange={e => onChange({ system_prompt: e.target.value })}
            rows={8}
            className={`${inputCls} font-mono text-xs resize-none`}
            placeholder={`You are an AI voice assistant for Acme Corp. Your role is to:\n- Answer product questions clearly\n- Qualify inbound leads\n- Schedule demos for the sales team\n\nAlways be concise. Never fabricate information.`}
          />
          <p className="text-[11px] text-slate-400 mt-1">{(config.system_prompt ?? '').length} / 2000 characters</p>
        </Field>
      </Section>

      {/* Temperature */}
      <Section title="Creativity" description="Controls how deterministic vs. creative the model's responses are.">
        <Field label={`Temperature: ${Number(config.temperature ?? 0.7).toFixed(1)}`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={config.temperature ?? 0.7}
            onChange={e => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>Precise (0.0)</span>
            <span>Balanced (0.7)</span>
            <span>Creative (1.0)</span>
          </div>
        </Field>
      </Section>
    </div>
  );
}
