'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, SystemHealth, AdminTenant } from '@/services/admin.api';
import { DashboardSkeleton } from '@/components/ui/skeletons';
import { ErrorState } from '@/components/ui/error-state';

function StatusDot({ status }: { status: string }) {
  const color = status === 'operational' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-red-500';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 ${color === 'bg-emerald-500' ? 'ring-emerald-200' : 'ring-red-200'}`} />;
}

export default function AdminOverview() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [h, t] = await Promise.all([
        adminApi.getSystemHealth(),
        adminApi.getTenants(),
      ]);
      setHealth(h);
      setTenants(t.tenants || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const totalSpend = tenants.reduce((s, t) => s + (parseFloat(String(t.total_spend)) || 0), 0);
  const totalCalls = tenants.reduce((s, t) => s + (parseInt(String(t.total_calls)) || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <header>
        <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">Admin Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Platform health, tenants, and global metrics at a glance.</p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
              <span className="material-symbols-outlined">apartment</span>
            </div>
            <p className="text-sm font-medium text-slate-500">Tenants</p>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{tenants.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
              <span className="material-symbols-outlined">call</span>
            </div>
            <p className="text-sm font-medium text-slate-500">Total Calls</p>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{totalCalls.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-500">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <p className="text-sm font-medium text-slate-500">Platform Revenue</p>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">${totalSpend.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-500">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <p className="text-sm font-medium text-slate-500">Queue Backlog</p>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{health?.metrics.queue_backlog ?? 0}</p>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold font-headline text-slate-900 dark:text-white">System Status</h2>
          <Link href="/admin/system" className="text-xs font-bold text-primary hover:underline">View Details →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">
          {health && Object.entries(health.status).map(([key, val]) => (
            <div key={key} className="p-5 text-center">
              <StatusDot status={val} />
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-2 capitalize">{key}</p>
              <p className="text-xs text-slate-500 capitalize">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Tenants */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Top Tenants</h2>
          <Link href="/admin/tenants" className="text-xs font-bold text-primary hover:underline">See All →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Business</th>
              <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
              <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Calls</th>
              <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {tenants.slice(0, 5).map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{t.business_name}</td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                    t.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    t.status === 'trial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300 tabular-nums">{parseInt(String(t.total_calls)).toLocaleString()}</td>
                <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">${parseFloat(String(t.total_spend)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
