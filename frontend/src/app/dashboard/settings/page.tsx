'use client';
import React from 'react';

export default function SettingsPage() {
  return (
    <div className="h-full flex flex-col">
      <header className="mb-8 shrink-0">
        <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Manage workspace preferences and billing.</p>
      </header>

      <div className="grid md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-2">
           {['General', 'Billing & Plans', 'Team Members', 'API Integrations', 'Notifications'].map((tab, i) => (
             <div key={i} className={`p-3 rounded-xl font-bold text-sm cursor-pointer transition-colors ${i === 0 ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-800' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
               {tab}
             </div>
           ))}
        </div>
        
        <div className="md:col-span-3 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-xl font-bold font-headline mb-6">Workspace Settings</h2>
              <div className="space-y-4 max-w-md">
                 <div className="space-y-2">
                   <label className="block text-sm font-bold text-slate-500">Workspace Name</label>
                   <input type="text" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20" defaultValue="Nexus Realty" />
                 </div>
                 <div className="space-y-2">
                   <label className="block text-sm font-bold text-slate-500">Timezone</label>
                   <select className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20">
                     <option>Eastern Time (EST)</option>
                     <option>Pacific Time (PST)</option>
                   </select>
                 </div>
                 <button className="bg-primary hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-colors mt-4">Save Changes</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
