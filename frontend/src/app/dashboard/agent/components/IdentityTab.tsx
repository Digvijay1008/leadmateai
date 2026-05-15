'use client';

import React from 'react';
import { Section, Field, inputCls } from './shared';
import { AgentConfig } from '@/features/telephony/types';

interface Props {
  config: Partial<AgentConfig>;
  onChange: (updates: Partial<AgentConfig>) => void;
}

export function IdentityTab({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Agent Name" required>
          <input
            type="text"
            value={config.agent_name ?? ''}
            onChange={e => onChange({ agent_name: e.target.value })}
            className={inputCls}
            placeholder="e.g. Aria, Max, Nova"
          />
        </Field>
        <Field label="Personality" hint="Short descriptor: e.g. Professional, Friendly, Empathetic">
          <input
            type="text"
            value={config.personality ?? ''}
            onChange={e => onChange({ personality: e.target.value })}
            className={inputCls}
            placeholder="Professional and empathetic"
          />
        </Field>
      </div>

      <Field label="Welcome Message" hint="First words spoken when a call connects." required>
        <textarea
          rows={2}
          value={config.greeting_message ?? ''}
          onChange={e => onChange({ greeting_message: e.target.value })}
          className={`${inputCls} resize-none`}
          placeholder="Hi there! Thanks for calling Acme Corp. How can I help you today?"
        />
      </Field>

      <Field label="Business Context" hint="Describe what your business does. The AI uses this for accurate context.">
        <textarea
          rows={4}
          value={config.business_context ?? ''}
          onChange={e => onChange({ business_context: e.target.value })}
          className={`${inputCls} resize-none`}
          placeholder="We are a B2B SaaS company that helps real estate agents automate lead follow-up with AI phone calls. We serve agents across India and the US."
        />
      </Field>
    </div>
  );
}
