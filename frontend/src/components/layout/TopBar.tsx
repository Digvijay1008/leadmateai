'use client';

import React from 'react';

export function TopBar() {
  return (
    <header className="fixed top-0 left-56 right-0 z-30 h-14 flex items-center justify-between px-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative w-72">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-300 dark:focus:border-indigo-700 rounded-lg py-1.5 pl-9 pr-3 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none transition-colors"
            placeholder="Search agents, calls, contacts..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          className="relative text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-none">Admin</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Workspace</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
