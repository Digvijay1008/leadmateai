'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const navLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { name: 'Widget', href: '/dashboard/widget', icon: 'smart_toy' },
  { name: 'Agent', href: '/dashboard/agent', icon: 'support_agent' },
  { name: 'Leads', href: '/dashboard/leads', icon: 'groups' },
  { name: 'Properties', href: '/dashboard/properties', icon: 'real_estate_agent' },
  { name: 'Knowledge', href: '/dashboard/knowledge', icon: 'menu_book' },
  { name: 'Calls', href: '/dashboard/calls', icon: 'call' },
  { name: 'Dialer', href: '/dashboard/dialer', icon: 'dialpad' },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: 'campaign' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: 'leaderboard' },
  { name: 'Phone Numbers', href: '/dashboard/phone-numbers', icon: 'sim_card' },
  { name: 'Billing', href: '/dashboard/billing', icon: 'account_balance_wallet' },
  { name: 'Settings', href: '/dashboard/settings', icon: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tenant_token');
      router.push('/login');
    }
  };

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-50 dark:bg-slate-950 flex flex-col p-4 gap-2 z-40 border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-4 mb-2 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
          <span className="material-symbols-outlined">real_estate_agent</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none font-headline">
            LeadMate AI
          </h1>
          <p className="text-[10px] text-slate-500 tracking-wider uppercase mt-1 font-body">
            Premium Real Estate
          </p>
        </div>
      </div>

      {/* New Campaign CTA */}
      <Link
        href="/dashboard/campaigns"
        className="w-full bg-primary text-white rounded-xl py-3 px-4 font-bold text-sm mb-2 flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">add</span>
        New Campaign
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {navLinks.map((link) => {
          const isActive =
            link.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 font-headline text-sm font-semibold rounded-xl transition-all',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-primary dark:text-indigo-200 translate-x-1'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
              )}
            >
              <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-0.5 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-3 px-4 py-2.5 font-headline text-sm font-semibold rounded-xl transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
