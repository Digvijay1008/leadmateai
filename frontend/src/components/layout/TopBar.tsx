'use client';

import React from 'react';

export function TopBar() {
  return (
    <header className="fixed top-0 left-64 right-0 z-30 flex justify-between items-center px-8 py-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm dark:shadow-none border-b border-transparent">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
          <input 
            type="text"
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
            placeholder="Search leads, properties, or recordings..."
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <button className="relative text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">Julian Vance</p>
            <p className="text-[11px] text-slate-500">Admin Director</p>
          </div>
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZHacUhgxLH7urZmhpZWFP8Sg_hpOdwPxyFfl6wG_UB3TTlPTjqTpzQPcn0Mz5EWoS6eK4CuKW-ZBEmbS84fkX1eLwDz_BZp5uFJVUeneuDViKxYVghm0jKGDufF-PwYJXk2rMovEf0K8gzKyaKNxuzjA8ejlY9oCzR-7P2rgj1Z7UG9CiZvlCmvaMw2mOuRHIJyWsbmkXa98Hzb_DvE2rsRhAxGs0xcddja2Tr1gzC0Dmo-jZlaJoV5YFpcrhZqorYUHQlyqpzMva" 
            alt="User profile avatar" 
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
          />
        </div>
      </div>
    </header>
  );
}
