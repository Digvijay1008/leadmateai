'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, UsageDay } from '@/services/admin.api';
import { DashboardSkeleton } from '@/components/ui/skeletons';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

export default function AdminUsagePage() {
  const [usage, setUsage] = useState<UsageDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getUsage();
      setUsage(res.usage || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalCalls = usage.reduce((s, d) => s + (parseInt(String(d.calls_per_day)) || 0), 0);
  const totalMinutes = usage.reduce((s, d) => s + (parseFloat(String(d.minutes_used)) || 0), 0);
  const avgSuccess = usage.length > 0 ? (usage.reduce((s, d) => s + (parseFloat(String(d.success_rate)) || 0), 0) / usage.length) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header>
        <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">Platform Usage</h1>
        <p className="text-sm text-slate-500 mt-1">Calls, minutes, and success rates across the last 30 days.</p>
      </header>

      {loading ? <DashboardSkeleton /> : error ? <ErrorState message={error} onRetry={fetchData} /> : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
                  <span className="material-symbols-outlined">call</span>
                </div>
                <p className="text-sm font-medium text-slate-500">Total Calls (30d)</p>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{totalCalls.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                  <span className="material-symbols-outlined">timer</span>
                </div>
                <p className="text-sm font-medium text-slate-500">Minutes Used (30d)</p>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{Math.round(totalMinutes).toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-500">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <p className="text-sm font-medium text-slate-500">Avg Success Rate</p>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{avgSuccess.toFixed(1)}%</p>
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Daily Breakdown</h2>
            </div>
            {usage.length === 0 ? (
              <EmptyState icon="data_usage" title="No Usage Data" description="Not enough call data for the last 30 days." />
            ) : (
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                      <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Calls</th>
                      <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Minutes</th>
                      <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {usage.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{parseInt(String(d.calls_per_day)).toLocaleString()}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{Math.round(parseFloat(String(d.minutes_used))).toLocaleString()}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-bold tabular-nums ${
                            parseFloat(String(d.success_rate)) >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                            parseFloat(String(d.success_rate)) >= 50 ? 'text-amber-600 dark:text-amber-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {parseFloat(String(d.success_rate)).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
