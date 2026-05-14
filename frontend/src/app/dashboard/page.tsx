'use client';

import React, { useState } from 'react';
import { useDashboardSummaryQuery } from '@/features/analytics/hooks';
import { useSessionsQuery } from '@/features/sessions/hooks';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { KpiCard } from '@/components/ui/kpi-card';
import Link from 'next/link';

function formatCurrency(value: number | undefined): string {
  if (!value) return '$0';
  if (value >= 10000000) return `$${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `$${(value / 100000).toFixed(1)}L`;
  return `$${(value / 1000).toFixed(0)}k`;
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const {
    data: summary,
    isLoading: loadingDash,
    error: errorDash,
    refetch: refetchDash,
  } = useDashboardSummaryQuery();
  const {
    data: sessionsData,
    isLoading: loadingSess,
    error: errorSess,
    refetch: refetchSess,
  } = useSessionsQuery({ period: timeRange, limit: 10 });

  const loading = loadingDash || loadingSess;
  const error = errorDash || errorSess;
  const refetch = () => { refetchDash(); refetchSess(); };
  const sessions = sessionsData?.sessions ?? [];

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const rangeLabels: Record<string, string> = {
    '7days': 'This Week',
    '30days': 'This Month',
    '90days': 'This Quarter',
    all: 'All Time',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">
            Overview
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Here&apos;s what your AI agents have been up to.
          </p>
        </div>
        <div className="flex gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
          {(['7days', '30days', '90days'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                timeRange === range
                  ? 'bg-primary text-white shadow'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {rangeLabels[range]}
            </button>
          ))}
        </div>
      </header>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Leads"
          value={summary?.leads_this_month ?? 0}
          trend="+0%"
          icon="group"
          color="text-indigo-500"
          bg="bg-indigo-50 dark:bg-indigo-900/30"
          trendType="positive"
        />
        <KpiCard
          label="Active Calls"
          value={summary?.sessions_today ?? 0}
          trend="Live"
          icon="mic"
          color="text-emerald-500"
          bg="bg-emerald-50 dark:bg-emerald-900/30"
          trendType="live"
        />
        <KpiCard
          label="Booked Visits"
          value={summary?.leads_converted ?? 0}
          trend="+0%"
          icon="event_available"
          color="text-amber-500"
          bg="bg-amber-50 dark:bg-amber-900/30"
          trendType="positive"
        />
        <KpiCard
          label="Conversion %"
          value={`${summary?.conversion_rate?.toFixed(1) ?? 0}%`}
          trend="+0%"
          icon="trending_up"
          color="text-primary"
          bg="bg-primary/10"
          trendType="positive"
        />
        <KpiCard
          label="Wallet Balance"
          value={formatCurrency(summary?.wallet_balance)}
          icon="payments"
          color="text-teal-500"
          bg="bg-teal-50 dark:bg-teal-900/30"
        />
      </div>

      {/* Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Recent Sessions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-hidden flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-lg font-bold font-headline">Recent Sessions</h2>
            <Link
              href="/dashboard/calls"
              className="text-primary text-sm font-bold hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="overflow-y-auto pr-2 flex-1">
            {sessions.length === 0 ? (
              <div className="py-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Get started — complete these steps
                </p>
                <div className="space-y-2">
                  {[
                    { step: 1, label: 'Create an AI Agent', desc: 'Configure your voice personality and system prompt', href: '/dashboard/agent', icon: 'smart_toy', color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
                    { step: 2, label: 'Upload Knowledge', desc: 'Add SOPs, FAQs, and docs so your agent can answer questions', href: '/dashboard/knowledge', icon: 'library_books', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
                    { step: 3, label: 'Add a Phone Number', desc: 'Assign a number so customers can call your AI', href: '/dashboard/phone-numbers', icon: 'phone', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
                    { step: 4, label: 'Make a Test Call', desc: 'Dial in and verify the full voice experience works', href: '/dashboard/dialer', icon: 'call', color: 'bg-primary/10 text-primary' },
                  ].map(({ step, label, desc, href, icon, color }) => (
                    <Link
                      key={step}
                      href={href}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors">
                          <span className="text-slate-400 font-medium mr-1">{step}.</span>{label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{desc}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-[18px]">
                        chevron_right
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.slice(0, 10).map((session, index) => (
                  <div
                    key={session.id || index}
                    className="flex gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="mt-1 text-slate-400">
                      <span className="material-symbols-outlined">call</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Voice Session
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">
                        Duration: {session.duration_seconds ?? 0}s | Cost: $
                        {session.total_cost?.toFixed(2) ?? '0.00'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-400 self-center">
                      {session.created_at
                        ? new Date(session.created_at).toLocaleDateString()
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side widgets */}
        <div className="space-y-6">
          {/* Stats summary */}
          <div className="bg-primary/5 rounded-2xl border border-primary/20 p-6">
            <h2 className="text-lg font-bold font-headline flex items-center gap-2 mb-4 text-primary">
              <span className="material-symbols-outlined">leaderboard</span> Period Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Sessions</span>
                <span className="font-bold text-slate-800 dark:text-white">{sessions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Leads Converted</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {summary?.leads_converted ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Conversion Rate</span>
                <span className="font-bold text-emerald-600">
                  {summary?.conversion_rate?.toFixed(1) ?? 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Low balance warning */}
          {summary && summary.wallet_balance < 100 && (
            <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 p-6">
              <h2 className="text-lg font-bold font-headline flex items-center gap-2 mb-3 text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined">warning</span> Low Balance
              </h2>
              <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-4">
                Your wallet balance is low. Add funds to continue using voice services.
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add_card</span>
                Top Up Wallet
              </Link>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-base font-bold font-headline mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href="/dashboard/campaigns"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="material-symbols-outlined text-primary">campaign</span>
                New Campaign
              </Link>
              <Link
                href="/dashboard/leads"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="material-symbols-outlined text-primary">group_add</span>
                Add Leads
              </Link>
              <Link
                href="/dashboard/dialer"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="material-symbols-outlined text-primary">dialpad</span>
                Open Dialer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}