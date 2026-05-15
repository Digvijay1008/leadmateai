'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDashboardSummaryQuery } from '@/features/analytics/hooks';
import { useSessionsQuery } from '@/features/sessions/hooks';

// ─── Types ──────────────────────────────────────────────────────────────────

type TimeRange = '7days' | '30days' | '90days';

interface Session {
  id?: string;
  duration_seconds?: number;
  total_cost?: number;
  status?: string;
  created_at?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatMoney(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value.toFixed(0)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  sub?: string;
  accent?: string;
  live?: boolean;
}

function StatCard({ label, value, icon, sub, accent = 'text-indigo-500', live }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0`}>
        <span className={`material-symbols-outlined text-[18px] ${accent}`}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-slate-400 mt-1 truncate">{sub}</p>
        )}
      </div>
      {live && (
        <span className="flex items-center gap-1 shrink-0 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Live</span>
        </span>
      )}
    </div>
  );
}

// ─── Setup Checklist ────────────────────────────────────────────────────────

const SETUP_STEPS = [
  {
    step: 1,
    title: 'Create Agent',
    desc: 'Set system prompt, voice, and language',
    href: '/dashboard/agent',
    icon: 'smart_toy',
  },
  {
    step: 2,
    title: 'Upload Knowledge',
    desc: 'Add SOPs, FAQs, and product docs',
    href: '/dashboard/knowledge',
    icon: 'library_books',
  },
  {
    step: 3,
    title: 'Connect SIP Number',
    desc: 'Add a phone number and SIP trunk',
    href: '/dashboard/phone-numbers',
    icon: 'sim_card',
  },
  {
    step: 4,
    title: 'Test a Call',
    desc: 'Dial in and verify the full experience',
    href: '/dashboard/dialer',
    icon: 'call',
  },
  {
    step: 5,
    title: 'Launch Campaign',
    desc: 'Import contacts and start outbound calls',
    href: '/dashboard/campaigns',
    icon: 'rocket_launch',
  },
] as const;

// ─── Session Row ─────────────────────────────────────────────────────────────

function SessionRow({ session, index }: { session: Session; index: number }) {
  const isConnected = session.status === 'completed' || session.status === 'active';
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isConnected
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
      }`}>
        <span className="material-symbols-outlined text-[14px]">call</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Voice Session #{(index + 1).toString().padStart(3, '0')}
        </p>
        <p className="text-xs text-slate-400">
          {session.duration_seconds ? formatDuration(session.duration_seconds) : '—'}
          {session.total_cost ? ` · $${session.total_cost.toFixed(3)}` : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
          isConnected
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
        }`}>
          {session.status ?? 'unknown'}
        </span>
        {session.created_at && (
          <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(session.created_at)}</p>
        )}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');

  const { data: summary, isLoading: loadingDash } = useDashboardSummaryQuery();
  const { data: sessionsData, isLoading: loadingSess } = useSessionsQuery({
    period: timeRange,
    limit: 10,
  });

  const sessions: Session[] = sessionsData?.sessions ?? [];
  const loading = loadingDash || loadingSess;

  const totalSessions = sessions.length;
  const connectedSessions = sessions.filter(
    s => s.status === 'completed' || s.status === 'active',
  ).length;
  const successRate = totalSessions > 0
    ? Math.round((connectedSessions / totalSessions) * 100)
    : 0;
  const avgDuration = totalSessions > 0
    ? Math.round(
        sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / totalSessions,
      )
    : 0;

  const TIME_LABELS: Record<TimeRange, string> = {
    '7days': '7d',
    '30days': '30d',
    '90days': '90d',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AI call operations at a glance.
          </p>
        </div>
        <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
          {(['7days', '30days', '90days'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                timeRange === range
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {TIME_LABELS[range]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <StatCard
          label="Total Sessions"
          value={loading ? '—' : totalSessions}
          icon="headset_mic"
          sub={`${timeRange === '7days' ? 'this week' : timeRange === '30days' ? 'this month' : 'this quarter'}`}
          accent="text-indigo-500"
        />
        <StatCard
          label="Active Calls"
          value={loading ? '—' : (summary?.sessions_today ?? 0)}
          icon="call"
          sub="right now"
          accent="text-emerald-500"
          live
        />
        <StatCard
          label="AI Success Rate"
          value={loading ? '—' : `${successRate}%`}
          icon="verified"
          sub={`${connectedSessions} connected`}
          accent="text-teal-500"
        />
        <StatCard
          label="Avg Duration"
          value={loading ? '—' : formatDuration(avgDuration)}
          icon="timer"
          sub="per session"
          accent="text-amber-500"
        />
        <StatCard
          label="Wallet Balance"
          value={loading ? '—' : formatMoney(summary?.wallet_balance ?? 0)}
          icon="account_balance_wallet"
          sub={summary && summary.wallet_balance < 100 ? '⚠ Low balance' : 'available'}
          accent={(summary?.wallet_balance ?? 0) < 100 ? 'text-red-500' : 'text-slate-500'}
        />
      </div>

      {/* Main content row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Session feed */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent Sessions</h2>
            <Link
              href="/dashboard/calls"
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-4 text-sm text-slate-400 text-center">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="px-4 py-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Get started
                </p>
                <div className="space-y-1">
                  {SETUP_STEPS.map(({ step, title, desc, href, icon }) => (
                    <Link
                      key={step}
                      href={href}
                      className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                        <span className="material-symbols-outlined text-[14px] text-slate-500 group-hover:text-indigo-500 transition-colors">
                          {icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          <span className="text-slate-400 font-medium">{step}. </span>{title}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{desc}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-indigo-400 transition-colors text-[16px]">
                        chevron_right
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              sessions.map((session, i) => (
                <SessionRow key={session.id ?? i} session={session} index={i} />
              ))
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-3">
          {/* Period stats */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
              Period Summary
            </h2>
            <div className="space-y-2.5">
              {[
                { label: 'Sessions', value: totalSessions },
                { label: 'Connected', value: connectedSessions },
                {
                  label: 'Contacts Engaged',
                  value: summary?.leads_converted ?? 0,
                },
                {
                  label: 'Conversion Rate',
                  value: `${summary?.conversion_rate?.toFixed(1) ?? 0}%`,
                  highlight: true,
                },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{label}</span>
                  <span className={`text-sm font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {loading ? '—' : value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Low balance alert */}
          {!loading && summary && summary.wallet_balance < 100 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-red-500 text-[18px]">warning</span>
                <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Low Balance</h3>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                Calls may stop if your balance runs out.
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">add_card</span>
                Top Up
              </Link>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
              Quick Actions
            </h2>
            <div className="space-y-0.5">
              {[
                { label: 'New Campaign', href: '/dashboard/campaigns', icon: 'rocket_launch' },
                { label: 'Open Dialer', href: '/dashboard/dialer', icon: 'dialpad' },
                { label: 'Add Contacts', href: '/dashboard/contacts', icon: 'group_add' },
                { label: 'Edit Agent', href: '/dashboard/agent', icon: 'smart_toy' },
              ].map(({ label, href, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <span className="material-symbols-outlined text-[16px] text-indigo-400 group-hover:text-indigo-500 transition-colors">
                    {icon}
                  </span>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
