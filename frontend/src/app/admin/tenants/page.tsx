'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, AdminTenant } from '@/services/admin.api';
import { TableSkeleton } from '@/components/ui/skeletons';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getTenants();
      setTenants(res.tenants || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = tenants.filter(
    (t) => t.business_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">Tenants</h1>
          <p className="text-sm text-slate-500 mt-1">All registered businesses on the platform.</p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants..."
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
          />
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="apartment" title="No Tenants Found" description={search ? 'No tenants match your search.' : 'No tenants registered yet.'} />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Business Name</th>
                  <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Wallet</th>
                  <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Total Calls</th>
                  <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Total Spend</th>
                  <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((t) => {
                  const walletBalance = parseFloat(String(t.wallet_balance)) || 0;
                  const isLowWallet = walletBalance < 10;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{t.business_name}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                          t.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          t.status === 'trial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          t.status === 'suspended' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>{t.status}</span>
                      </td>
                      <td className={`px-5 py-4 text-right tabular-nums font-bold ${isLowWallet ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                        ${walletBalance.toFixed(2)}
                        {isLowWallet && <span className="material-symbols-outlined text-red-500 text-xs ml-1 align-middle">warning</span>}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300 tabular-nums">{parseInt(String(t.total_calls)).toLocaleString()}</td>
                      <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300 tabular-nums">${parseFloat(String(t.total_spend)).toFixed(2)}</td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
