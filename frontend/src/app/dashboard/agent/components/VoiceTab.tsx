'use client';

import React, { useState } from 'react';
import { Section, Field, inputCls, ProviderBadge } from './shared';
import { AgentConfig } from '@/features/telephony/types';
import { VoiceOption } from '@/features/telephony/api';

interface Props {
  config: Partial<AgentConfig>;
  voices: VoiceOption[];
  voicesLoading: boolean;
  onChange: (updates: Partial<AgentConfig>) => void;
}

const TTS_PROVIDERS = ['openai', 'elevenlabs', 'deepgram', 'cartesia', 'sarvam'];
const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
];

export function VoiceTab({ config, voices, voicesLoading, onChange }: Props) {
  const [langFilter, setLangFilter] = useState<string>('');

  const filteredVoices = voices.filter(v => {
    const matchProvider = !config.tts_provider || v.provider === config.tts_provider;
    const matchLang = !langFilter || v.language === langFilter;
    return matchProvider && matchLang;
  });

  return (
    <div className="space-y-6">
      {/* TTS Provider */}
      <Section title="TTS Provider" description="Select the text-to-speech engine for your agent.">
        <div className="grid grid-cols-2 gap-2">
          {TTS_PROVIDERS.map(p => {
            const isActive = config.tts_provider === p;
            const count = voices.filter(v => v.provider === p).length;
            return (
              <button
                key={p}
                onClick={() => onChange({ tts_provider: p, tts_voice_id: undefined })}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                  isActive ? 'bg-indigo-100 dark:bg-indigo-800/40' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {p === 'openai' ? '⚡' : p === 'elevenlabs' ? '🎙️' : p === 'deepgram' ? '🌊' : p === 'sarvam' ? '🇮🇳' : '🌀'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold capitalize truncate ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {p === 'elevenlabs' ? 'ElevenLabs' : p === 'sarvam' ? 'Sarvam AI' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </p>
                  <p className="text-[10px] text-slate-400">{count} voice{count !== 1 ? 's' : ''}</p>
                </div>
                {isActive && <span className="material-symbols-outlined text-indigo-500 text-[16px]">check_circle</span>}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Voice Selection */}
      <Section
        title="Voice"
        description="Choose the voice persona for your agent."
        action={
          <select
            value={langFilter}
            onChange={e => setLangFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <option value="">All languages</option>
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        }
      >
        {voicesLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredVoices.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            <span className="material-symbols-outlined text-2xl block mb-1">mic_off</span>
            No voices match the current filter.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {filteredVoices.map(voice => {
              const isActive = config.tts_voice_id === voice.id;
              return (
                <button
                  key={voice.id}
                  onClick={() => onChange({ tts_voice_id: voice.id, tts_provider: voice.provider, tts_language: voice.language })}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                    isActive
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {voice.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {voice.name}
                      </span>
                      <ProviderBadge provider={voice.provider} />
                      <span className="text-[10px] text-slate-400">{voice.gender}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{voice.accent} · {voice.language}</p>
                  </div>
                  {isActive && <span className="material-symbols-outlined text-indigo-500 text-[16px]">check_circle</span>}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Speech settings */}
      <div className="grid grid-cols-2 gap-4">
        <Section title="Language">
          <select
            value={config.tts_language ?? 'en-US'}
            onChange={e => onChange({ tts_language: e.target.value })}
            className={inputCls}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </Section>

        <Section title={`Speed: ${Number(config.speech_speed ?? 1.0).toFixed(1)}x`}>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={config.speech_speed ?? 1.0}
            onChange={e => onChange({ speech_speed: parseFloat(e.target.value) })}
            className="w-full accent-indigo-500 mt-2"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0.5x</span>
            <span>Normal</span>
            <span>2.0x</span>
          </div>
        </Section>
      </div>

      {/* Interruption */}
      <Section title="Interruption Sensitivity" description="How the agent handles being interrupted mid-speech.">
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'immediate', label: 'Immediate', desc: 'Stop instantly', icon: 'bolt' },
            { id: 'polite', label: 'Polite', desc: 'Finish sentence', icon: 'hourglass_top' },
            { id: 'none', label: 'None', desc: 'Always complete', icon: 'do_not_disturb' },
          ].map(opt => {
            const isActive = (config.interruption_sensitivity ?? 'immediate') === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onChange({ interruption_sensitivity: opt.id })}
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
                <p className="text-[10px] text-slate-400">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
