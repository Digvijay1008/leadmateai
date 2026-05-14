'use client';
import React from 'react';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  pulse?: boolean;
}

export function StatusBadge({ label, variant = 'neutral', pulse = false }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${variantStyles[variant]} ${pulse ? 'animate-pulse' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        variant === 'success' ? 'bg-emerald-500' :
        variant === 'error' ? 'bg-red-500' :
        variant === 'warning' ? 'bg-amber-500' :
        variant === 'info' ? 'bg-blue-500' : 'bg-slate-400'
      }`} />
      {label}
    </span>
  );
}

// ─── Reusable Info Card ──────────────────────────────────────────────────────

interface InfoCardProps {
  icon: string;
  label: string;
  value: string | number;
  description?: string;
  color?: string;
  bg?: string;
}

export function InfoCard({ icon, label, value, description, color = 'text-primary', bg = 'bg-primary/10' }: InfoCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex justify-between items-end mb-8 shrink-0">
      <div>
        <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">{title}</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">{subtitle}</p>
      </div>
      {action && <div className="flex gap-3">{action}</div>}
    </header>
  );
}
