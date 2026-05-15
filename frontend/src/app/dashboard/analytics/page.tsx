'use client';
import React, { useState } from 'react';
import { useDashboardSummaryQuery, useCallStatsQuery } from '@/features/analytics/hooks';
import { useSessionsQuery } from '@/features/sessions/hooks';
import { AnalyticsFilters } from '@/features/analytics/types';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

function StatCard({ label, value, icon, color, bg }: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsFilters['period']>('30days');
  const { data: summary, isLoading: loadingSummary, error: errorSummary } = useDashboardSummaryQuery();
  const { data: callStats, isLoading: loadingStats, error: errorStats } = useCallStatsQuery({ period });
  const { data: sessionsData, isLoading: loadingSessions, error: errorSessions } = useSessionsQuery({ period });

  const loading = loadingSummary || loadingStats || loadingSessions;
  const error = errorSummary || errorStats || errorSessions;
  const sessions = sessionsData?.sessions ?? [];

  if (loading) {
    return <LoadingState message="Loading analytics..." />;
  }

  if (error) {
    return <ErrorState message={error.message || 'Failed to load analytics'} />;
  }

  const totalSessions = callStats?.total_sessions ?? sessions.length;
  const avgDuration = callStats?.avg_duration ?? 0;
  const totalCost = callStats?.total_cost ?? 0;
  const completedSessions = callStats?.completed_sessions ?? sessions.filter(s => s.status === 'completed').length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">Analytics</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Deep dive into funnel conversion metrics.</p>
        </div>
        <div className="flex gap-3">
          <select
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm px-4 py-2 font-bold shadow-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as AnalyticsFilters['period'])}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Contacts" value={summary?.leads_this_month ?? 0} icon="group" color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-900/30" />
        <StatCard label="Sessions" value={totalSessions} icon="mic" color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-900/30" />
        <StatCard label="Avg Duration" value={`${Math.round(avgDuration)}s`} icon="timer" color="text-amber-500" bg="bg-amber-50 dark:bg-amber-900/30" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} icon="check_circle" color="text-teal-500" bg="bg-teal-50 dark:bg-teal-900/30" />
        <StatCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} icon="payments" color="text-purple-500" bg="bg-purple-50 dark:bg-purple-900/30" />
      </div>

      {/* Sessions Table */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Session History</h2>
        </div>

        {sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-6">
              <span className="material-symbols-outlined text-4xl">donut_small</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Not Enough Data</h3>
            <p className="text-slate-500 max-w-md mx-auto text-sm">We need active voice sessions to generate meaningful analytics. Start a call to begin tracking.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">Session</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">Duration</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.map((session, idx) => (
                  <tr key={session.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      Session #{idx + 1}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {session.duration_seconds || 0}s
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        session.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {session.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {session.created_at ? new Date(session.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
