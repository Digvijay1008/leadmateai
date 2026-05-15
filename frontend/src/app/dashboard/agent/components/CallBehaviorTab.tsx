'use client';

import React from 'react';
import { Section, Field, inputCls } from './shared';
import { AgentConfig } from '@/features/telephony/types';

interface Props {
  config: Partial<AgentConfig>;
  onChange: (updates: Partial<AgentConfig>) => void;
}

const VOICEMAIL_OPTIONS = [
  { id: 'hangup', label: 'Hang Up', desc: 'Disconnect immediately', icon: 'call_end' },
  { id: 'leave_message', label: 'Leave Message', desc: 'Play fallback & disconnect', icon: 'voicemail' },
  { id: 'callback', label: 'Schedule Callback', desc: 'Log for follow-up', icon: 'call_made' },
];

export function CallBehaviorTab({ config, onChange }: Props) {
  const maxDur = config.max_call_duration ?? 900;
  const silenceMs = config.silence_timeout_ms ?? 10000;

  return (
    <div className="space-y-6">
      {/* Max Duration */}
      <Section title="Max Call Duration" description="Call will automatically end after this duration.">
        <Field label={`Duration: ${Math.floor(maxDur / 60)}m ${maxDur % 60}s`}>
          <input
            type="range"
            min={60}
            max={3600}
            step={60}
            value={maxDur}
            onChange={e => onChange({ max_call_duration: parseInt(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>1 min</span>
            <span>15 min</span>
            <span>60 min</span>
          </div>
        </Field>
      </Section>

      {/* Silence timeout */}
      <Section title="Silence Timeout" description="How long to wait in silence before ending the call.">
        <Field label={`Timeout: ${(Number(silenceMs) / 1000).toFixed(0)}s`}>
          <input
            type="range"
            min={3000}
            max={30000}
            step={1000}
            value={silenceMs}
            onChange={e => onChange({ silence_timeout_ms: parseInt(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>3s</span>
            <span>10s</span>
            <span>30s</span>
          </div>
        </Field>
      </Section>

      {/* Voicemail Behavior */}
      <Section title="Voicemail Behavior" description="What to do when the agent detects a voicemail.">
        <div className="grid grid-cols-3 gap-2">
          {VOICEMAIL_OPTIONS.map(opt => {
            const isActive = (config.voicemail_behavior ?? 'hangup') === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onChange({ voicemail_behavior: opt.id })}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] block mb-1 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>
                  {opt.icon}
                </span>
                <p className={`text-xs font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Fallback Message */}
      <Section title="Fallback Message" description="Spoken when the agent encounters an error or can't respond.">
        <Field label="Message">
          <textarea
            rows={2}
            value={config.fallback_message ?? ''}
            onChange={e => onChange({ fallback_message: e.target.value })}
            className={`${inputCls} resize-none`}
            placeholder="I'm sorry, I'm having trouble understanding. Let me connect you to someone who can help."
          />
        </Field>
      </Section>
    </div>
  );
}
