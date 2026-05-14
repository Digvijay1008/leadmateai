'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const adminLinks = [
  { name: 'Overview', href: '/admin', icon: 'space_dashboard' },
  { name: 'Tenants', href: '/admin/tenants', icon: 'apartment' },
  { name: 'Usage', href: '/admin/usage', icon: 'data_usage' },
  { name: 'System', href: '/admin/system', icon: 'monitor_heart' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Quick client-side role check from stored token
    try {
      const token = localStorage.getItem('tenant_token');
      if (!token) { router.push('/login'); return; }
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'admin' || payload?.user_metadata?.role === 'admin' || payload?.app_metadata?.role === 'admin') {
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }
    } catch {
      setAuthorized(false);
    }
  }, [router]);

  if (authorized === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-4xl">shield</span>
          </div>
          <h1 className="text-2xl font-black font-headline text-slate-900 dark:text-white">Access Denied</h1>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">You do not have admin privileges to access this area.</p>
          <Link href="/dashboard" className="inline-block mt-4 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-slate-900 dark:bg-black flex flex-col p-4 gap-1 border-r border-slate-800 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-5 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none font-headline">Admin</h1>
            <p className="text-[10px] text-slate-500 tracking-wider uppercase mt-0.5">LeadMate Control</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-0.5">
          {adminLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )}
              >
                <span className="material-symbols-outlined text-lg">{link.icon}</span>
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all font-medium"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
