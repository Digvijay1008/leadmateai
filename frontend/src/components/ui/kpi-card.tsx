'use client';

import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon: string;
  color: string;
  bg: string;
  trendType?: 'live' | 'positive' | 'neutral';
}

export function KpiCard({
  label,
  value,
  trend,
  icon,
  color,
  bg,
  trendType = 'neutral',
}: KpiCardProps) {
  const trendClass =
    trendType === 'live'
      ? 'bg-red-100 text-red-600 animate-pulse'
      : trendType === 'positive'
      ? 'bg-green-100 text-green-700'
      : 'bg-slate-100 text-slate-600';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendClass}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {value}
        </p>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
