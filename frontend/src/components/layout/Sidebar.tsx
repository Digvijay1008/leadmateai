'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavItem = {
  name: string;
  href: string;
  icon: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: 'grid_view' },
      { name: 'Agents', href: '/dashboard/agent', icon: 'smart_toy' },
      { name: 'Calls', href: '/dashboard/calls', icon: 'call' },
      { name: 'Campaigns', href: '/dashboard/campaigns', icon: 'rocket_launch' },
    ],
  },
  {
    label: 'Data',
    items: [
      { name: 'Contacts', href: '/dashboard/contacts', icon: 'group' },
      { name: 'Knowledge Base', href: '/dashboard/knowledge', icon: 'library_books' },
    ],
  },
  {
    label: 'Channels',
    items: [
      { name: 'Widget', href: '/dashboard/widget', icon: 'chat_bubble' },
      { name: 'Dialer', href: '/dashboard/dialer', icon: 'dialpad' },
      { name: 'Phone Numbers', href: '/dashboard/phone-numbers', icon: 'sim_card' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { name: 'Analytics', href: '/dashboard/analytics', icon: 'bar_chart' },
      { name: 'Billing', href: '/dashboard/billing', icon: 'account_balance_wallet' },
      { name: 'Settings', href: '/dashboard/settings', icon: 'settings' },
    ],
  },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200',
      )}
    >
      <span
        className={cn(
          'material-symbols-outlined text-[18px] shrink-0 transition-colors',
          isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300',
        )}
      >
        {item.icon}
      </span>
      {item.name}
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tenant_token');
      router.push('/login');
    }
  };

  return (
    <aside className="h-screen w-56 fixed left-0 top-0 flex flex-col z-40 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-[16px]">record_voice_over</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">Voice AI</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Call Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
