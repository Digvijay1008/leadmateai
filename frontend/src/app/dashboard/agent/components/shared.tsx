'use client';

import React from 'react';

// ─── Shared input/select class ────────────────────────────────────────────────
export const inputCls =
  'w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition placeholder:text-slate-400';

// ─── Section wrapper ──────────────────────────────────────────────────────────
export function Section({ title, description, children, action }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────
export function Field({ label, hint, children, required }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Provider Badge ────────────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  openai:     'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  anthropic:  'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  google:     'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  groq:       'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  elevenlabs: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  deepgram:   'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
  cartesia:   'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
};

export function ProviderBadge({ provider }: { provider: string }) {
  const cls = PROVIDER_COLORS[provider.toLowerCase()] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {provider}
    </span>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; icon: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
            active === tab.id
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider() {
  return <div className="border-t border-slate-100 dark:border-slate-800" />;
}

// ─── Save Button ──────────────────────────────────────────────────────────────
export function SaveButton({ isPending, saved, onClick }: {
  isPending: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-60 shadow-sm"
    >
      {isPending ? (
        <><span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>Saving…</>
      ) : saved ? (
        <><span className="material-symbols-outlined text-[14px]">check</span>Saved!</>
      ) : (
        <><span className="material-symbols-outlined text-[14px]">save</span>Save</>
      )}
    </button>
  );
}
