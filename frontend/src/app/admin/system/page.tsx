'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, SystemHealth } from '@/services/admin.api';
import { DashboardSkeleton } from '@/components/ui/skeletons';
import { ErrorState } from '@/components/ui/error-state';

function StatusCard({ label, status }: { label: string; status: string }) {
  const isOk = status === 'operational';
  return (
    <div className={`rounded-2xl p-6 border shadow-sm transition-all ${
      isOk 
        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' 
        : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isOk ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500' : 'bg-red-100 dark:bg-red-900/30 text-red-500'
        }`}>
          <span className="material-symbols-outlined">{isOk ? 'check_circle' : 'error'}</span>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
          isOk ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>{status}</span>
      </div>
      <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white capitalize">{label}</h3>
      <p className="text-xs text-slate-500 mt-0.5">{isOk ? 'All systems nominal' : 'Requires attention'}</p>
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getSystemHealth();
      setHealth(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!health) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">System Health</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time status of infrastructure components.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-base ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {/* Service Status */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(health.status).map(([key, val]) => (
            <StatusCard key={key} label={key} status={val} />
          ))}
        </div>
      </div>

      {/* Live Metrics */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Live Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Campaign Queue Backlog"
            value={health.metrics.queue_backlog}
            icon="pending_actions"
            color="bg-amber-50 dark:bg-amber-900/30 text-amber-500"
          />
          <MetricCard
            label="Active Worker Tasks"
            value={health.metrics.active_workers_tasks}
            icon="memory"
            color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500"
          />
          <MetricCard
            label="Active LiveKit Sessions"
            value={health.metrics.active_livekit_sessions}
            icon="voice_chat"
            color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500"
          />
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-slate-900 dark:bg-black rounded-2xl p-6 border border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined">info</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">Monitoring Notes</h3>
            <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
              <li>Queue backlog counts pending <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">campaign_calls</code> rows yet to be processed.</li>
              <li>Worker tasks show calls currently in <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">processing</code> state (locked by <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">FOR UPDATE SKIP LOCKED</code>).</li>
              <li>LiveKit sessions count active voice sessions — these are billed actively.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
