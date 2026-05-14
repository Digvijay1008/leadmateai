'use client';

import React, { useState, useEffect } from 'react';
import { useAgentConfigQuery, useUpdateAgentConfig } from '@/features/telephony/hooks';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/ui/status-badge';
import { VoiceConfigUpdateInput } from '@/features/telephony/types';

export default function AgentConfigPage() {
  const { data: config, isLoading, error, refetch } = useAgentConfigQuery();
  const updateMutation = useUpdateAgentConfig();
  
  const [formData, setFormData] = useState<VoiceConfigUpdateInput>({});

  useEffect(() => {
    if (config) {
      let parsedPrompt = config.system_prompt || '';
      let parsedTone = '';
      let parsedBehavior = '';

      if (parsedPrompt.includes('Tone:')) {
          const toneMatch = parsedPrompt.match(/Tone:\s*(.*)/);
          if (toneMatch) parsedTone = toneMatch[1];
          parsedPrompt = parsedPrompt.replace(/Tone:\s*(.*)\n?/, '');
      }
      if (parsedPrompt.includes('Behavior Rules:')) {
          const behaviorMatch = parsedPrompt.match(/Behavior Rules:\s*([\s\S]*)/);
          if (behaviorMatch) parsedBehavior = behaviorMatch[1];
          parsedPrompt = parsedPrompt.replace(/Behavior Rules:\s*([\s\S]*)/, '');
      }
      parsedPrompt = parsedPrompt.trim();

      setFormData({
        system_prompt: parsedPrompt,
        tone: parsedTone,
        behavior_rules: parsedBehavior,
        voice_preset: config.voice_preset as any,
        language: config.language as any,
        greeting_message: config.greeting_message,
        goodbye_message: config.goodbye_message,
        interruption_mode: config.interruption_mode as any,
        max_call_duration_seconds: config.max_call_duration_seconds,
      });
    }
  }, [config]);

  if (isLoading) {
    return <LoadingState message="Loading agent configuration..." />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refetch} />;
  }

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
      <PageHeader 
        title="Agent Configuration" 
        subtitle="Manage your AI agent's brain, prompt, tone, and behavior." 
        action={
          <button 
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
             {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-8">
        
        {/* Core Agent Brain */}
        <section>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Core Brain & Prompt</h3>
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">System Prompt (Instructions)</label>
                <textarea 
                  value={formData.system_prompt || ''}
                  onChange={(e) => setFormData(p => ({ ...p, system_prompt: e.target.value }))}
                  rows={5}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm"
                  placeholder="You are an AI assistant for a real estate agency..."
                />
                <p className="text-xs text-slate-500 mt-1">This forms the absolute core instruction set for the LLM.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tone & Personality</label>
                  <input 
                    type="text"
                    value={formData.tone || ''}
                    onChange={(e) => setFormData(p => ({ ...p, tone: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white"
                    placeholder="E.g., Professional, empathetic, sales-driven"
                  />
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Behavior & Interruption Rules</label>
                  <input 
                    type="text"
                    value={formData.behavior_rules || ''}
                    onChange={(e) => setFormData(p => ({ ...p, behavior_rules: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white"
                    placeholder="E.g., Never disclose pricing directly, always ask for email"
                  />
               </div>
             </div>
          </div>
        </section>

        {/* Voice Persona */}
        <section>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Voice & Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Voice Preset</label>
              <select 
                value={formData.voice_preset || ''}
                onChange={(e) => setFormData(p => ({ ...p, voice_preset: e.target.value as any }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white"
              >
                <option value="standard">Standard (Everyday reliable)</option>
                <option value="growth">Growth (Premium ElevenLabs)</option>
                <option value="regional">Regional (Local Indian Accent)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Language</label>
              <select 
                value={formData.language || ''}
                onChange={(e) => setFormData(p => ({ ...p, language: e.target.value as any }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="en-IN">English (India)</option>
                <option value="es-ES">Spanish</option>
                <option value="hi-IN">Hindi</option>
              </select>
            </div>
          </div>
        </section>

        {/* Scripting */}
        <section>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Call Scripting</h3>
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Greeting Message</label>
                <textarea 
                  value={formData.greeting_message || ''}
                  onChange={(e) => setFormData(p => ({ ...p, greeting_message: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white"
                  placeholder="Hello, how can I help you today?"
                />
                <p className="text-xs text-slate-500 mt-1">First words spoken when the user connects.</p>
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">End Call Message</label>
                <textarea 
                  value={formData.goodbye_message || ''}
                  onChange={(e) => setFormData(p => ({ ...p, goodbye_message: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white"
                  placeholder="Thank you for your time. Goodbye!"
                />
             </div>
          </div>
        </section>

        {/* Limits */}
        <section>
           <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Constraints</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Max Call Duration (Seconds)</label>
                <input 
                  type="number"
                  value={formData.max_call_duration_seconds || 0}
                  onChange={(e) => setFormData(p => ({ ...p, max_call_duration_seconds: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white"
                />
             </div>
           </div>
        </section>

      </div>
    </div>
  );
}
