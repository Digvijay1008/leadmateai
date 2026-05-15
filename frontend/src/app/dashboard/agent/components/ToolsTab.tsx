'use client';

import React from 'react';
import { Section, Field, inputCls } from './shared';
import { AgentConfig } from '@/features/telephony/types';

interface Props {
  config: Partial<AgentConfig>;
  onChange: (updates: Partial<AgentConfig>) => void;
}

interface ToolDef {
  key: keyof Pick<AgentConfig, 'booking_enabled' | 'transfer_enabled' | 'capture_lead_enabled'>;
  id: string;
  label: string;
  description: string;
  icon: string;
  iconColor: string;
  category: string;
}

const TOOLS: ToolDef[] = [
  {
    key: 'capture_lead_enabled',
    id: 'capture_lead',
    label: 'Lead Capture',
    description: 'Collect caller name, email, phone and save to CRM automatically.',
    icon: 'person_add',
    iconColor: 'text-emerald-500',
    category: 'CRM',
  },
  {
    key: 'booking_enabled',
    id: 'booking',
    label: 'Appointment Booking',
    description: 'Allow callers to schedule appointments based on your availability calendar.',
    icon: 'calendar_month',
    iconColor: 'text-indigo-500',
    category: 'Scheduling',
  },
  {
    key: 'transfer_enabled',
    id: 'transfer',
    label: 'Call Transfer',
    description: 'Transfer callers to a human agent or another number on request.',
    icon: 'phone_forwarded',
    iconColor: 'text-orange-500',
    category: 'Telephony',
  },
];

const SLOT_DURATIONS = [15, 20, 30, 45, 60, 90, 120];
const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ToolsTab({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Tool Toggles */}
      <Section title="Available Tools" description="Enable capabilities your agent can use during calls.">
        <div className="space-y-2">
          {TOOLS.map(tool => {
            const isEnabled = !!config[tool.key];
            return (
              <div
                key={tool.id}
                className={`rounded-xl border-2 transition-all ${
                  isEnabled
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isEnabled ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <span className={`material-symbols-outlined text-[20px] ${isEnabled ? tool.iconColor : 'text-slate-400'}`}>
                      {tool.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tool.label}</p>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                        {tool.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{tool.description}</p>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => onChange({ [tool.key]: !isEnabled })}
                    className={`relative w-10 h-5.5 rounded-full transition-all shrink-0 ${
                      isEnabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                    style={{ height: '22px' }}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      isEnabled ? 'left-[22px]' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {/* Booking config panel */}
                {tool.id === 'booking' && isEnabled && (
                  <div className="px-3 pb-3 pt-1 border-t border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-2">Booking Configuration</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Timezone">
                        <select className={inputCls + ' text-xs'}>
                          {TIMEZONES.map(tz => (
                            <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Slot Duration">
                        <select className={inputCls + ' text-xs'}>
                          {SLOT_DURATIONS.map(d => (
                            <option key={d} value={d}>{d} minutes</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Buffer Between Slots">
                        <select className={inputCls + ' text-xs'}>
                          {[0, 5, 10, 15, 20, 30].map(d => (
                            <option key={d} value={d}>{d === 0 ? 'None' : `${d} min`}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Advance Booking">
                        <select className={inputCls + ' text-xs'}>
                          <option value={1}>1 day ahead</option>
                          <option value={2}>2 days ahead</option>
                          <option value={7}>1 week ahead</option>
                          <option value={14}>2 weeks ahead</option>
                          <option value={30}>1 month ahead</option>
                        </select>
                      </Field>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Working Days</p>
                      <div className="flex gap-1.5">
                        {DAYS.map((day, i) => {
                          const active = i < 5; // Mon-Fri default
                          return (
                            <button
                              key={day}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                active
                                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Field label="Start Time">
                        <input type="time" defaultValue="09:00" className={inputCls + ' text-xs'} />
                      </Field>
                      <Field label="End Time">
                        <input type="time" defaultValue="18:00" className={inputCls + ' text-xs'} />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
