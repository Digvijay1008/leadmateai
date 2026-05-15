'use client';

import React from 'react';
import { AgentConfig } from '@/features/telephony/types';
import { VoiceOption, LLMOption } from '@/features/telephony/api';
import { ProviderBadge } from './shared';

interface Props {
  config: Partial<AgentConfig>;
  voices: VoiceOption[];
  llms: LLMOption[];
  isSaving: boolean;
  saved: boolean;
  onSave: () => void;
  onTest: () => void;
}

function StatRow({ label, value, badge }: { label: string; value: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        {badge}
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">{value}</span>
      </div>
    </div>
  );
}

export function RuntimePanel({ config, voices, llms, isSaving, saved, onSave, onTest }: Props) {
  const selectedVoice = voices.find(v => v.id === config.tts_voice_id);
  const selectedLLM = llms.find(m => m.id === config.llm_model);

  const isReady = !!(config.system_prompt && config.llm_model && config.tts_voice_id);

  const enabledToolsCount = [
    config.booking_enabled,
    config.transfer_enabled,
    config.capture_lead_enabled,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Status */}
      <div className={`rounded-xl border-2 p-3 ${
        isReady
          ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10'
          : 'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          <p className={`text-xs font-bold ${isReady ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {isReady ? 'Agent Ready' : 'Incomplete Config'}
          </p>
        </div>
        <p className="text-[11px] text-slate-500">
          {isReady
            ? 'All required settings are configured.'
            : 'Set a system prompt, LLM model, and voice to deploy.'}
        </p>
      </div>

      {/* Runtime Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Runtime Config</p>
        <StatRow
          label="LLM"
          value={selectedLLM?.name ?? 'Not set'}
          badge={selectedLLM ? <ProviderBadge provider={selectedLLM.provider} /> : undefined}
        />
        <StatRow
          label="Voice"
          value={selectedVoice?.name ?? 'Not set'}
          badge={selectedVoice ? <ProviderBadge provider={selectedVoice.provider} /> : undefined}
        />
        <StatRow label="Language" value={config.tts_language ?? 'en-US'} />
        <StatRow label="STT" value={config.stt_provider ?? 'deepgram'} />
        <StatRow label="Speed" value={`${Number(config.speech_speed ?? 1.0).toFixed(1)}x`} />
        <StatRow label="Interruption" value={config.interruption_sensitivity ?? 'immediate'} />
        <StatRow label="Tools Active" value={`${enabledToolsCount} tool${enabledToolsCount !== 1 ? 's' : ''}`} />
        <StatRow label="Max Duration" value={`${Math.floor((config.max_call_duration ?? 900) / 60)}m`} />
      </div>

      {/* Est. Cost */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Estimated Cost</p>
        <div className="flex items-end gap-1">
          <span className="text-lg font-black text-slate-800 dark:text-slate-100">~₹1.2</span>
          <span className="text-xs text-slate-400 mb-0.5">/ minute</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Based on {selectedLLM?.provider ?? 'openai'} + {selectedVoice?.provider ?? 'deepgram'} pricing
        </p>
      </div>

      {/* Actions */}
      <button
        onClick={onSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-sm font-bold transition-all disabled:opacity-60 shadow-sm"
      >
        {isSaving ? (
          <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>Saving…</>
        ) : saved ? (
          <><span className="material-symbols-outlined text-[16px]">check</span>Saved!</>
        ) : (
          <><span className="material-symbols-outlined text-[16px]">save</span>Save Changes</>
        )}
      </button>

      <button
        onClick={onTest}
        disabled={!isReady}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-sm"
      >
        <span className="material-symbols-outlined text-[16px]">call</span>
        Test Agent
      </button>

      {!isReady && (
        <p className="text-[11px] text-slate-400 text-center">Complete config to enable testing</p>
      )}
    </div>
  );
}
