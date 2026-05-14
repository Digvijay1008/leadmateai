'use client';

import React from 'react';
import { useLiveKitSettingsQuery } from '@/features/telephony/hooks';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader, InfoCard, StatusBadge } from '@/components/ui/status-badge';

export default function LiveKitSettingsPage() {
  const { data: settings, isLoading, error, refetch } = useLiveKitSettingsQuery();

  if (isLoading) {
    return <LoadingState message="Loading LiveKit settings..." />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refetch} />;
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader 
        title="LiveKit Settings" 
        subtitle="Manage WebRTC infrastructure and real-time voice streaming." 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <InfoCard 
          icon="router" 
          label="Server URL" 
          value={settings?.server_url?.replace('wss://', '').split('.')[0] || 'Unknown'} 
          description={settings?.region || 'Default Region'}
          color="text-indigo-500" 
          bg="bg-indigo-50 dark:bg-indigo-900/30" 
        />
        <InfoCard 
          icon="meeting_room" 
          label="Active Rooms" 
          value={settings?.rooms_active ?? 0} 
          color="text-emerald-500" 
          bg="bg-emerald-50 dark:bg-emerald-900/30" 
        />
        <InfoCard 
          icon="groups" 
          label="Participants" 
          value={settings?.participants_active ?? 0} 
          color="text-blue-500" 
          bg="bg-blue-50 dark:bg-blue-900/30" 
        />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex items-center gap-3 mb-3">
             <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-500">
               <span className="material-symbols-outlined">health_and_safety</span>
             </div>
             <p className="text-sm font-medium text-slate-500">Status</p>
           </div>
           <div className="mt-2">
             <StatusBadge 
                label={settings?.connection_status === 'connected' ? 'Operational' : 'Degraded'} 
                variant={settings?.connection_status === 'connected' ? 'success' : 'error'} 
                pulse={settings?.connection_status === 'connected'}
             />
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-3xl">
        <h2 className="text-lg font-bold font-headline text-slate-900 dark:text-white mb-6">API Credentials</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">API Key</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={settings?.api_key || ''} 
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 font-mono text-sm text-slate-600 dark:text-slate-400 focus:outline-none"
              />
              <button 
                 className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                 onClick={() => navigator.clipboard.writeText(settings?.api_key || '')}
              >
                Copy
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">API Secret</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={settings?.api_secret_masked || '••••••••••••••••••••••••'} 
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 font-mono text-sm text-slate-600 dark:text-slate-400 focus:outline-none"
              />
              <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                Regenerate
              </button>
            </div>
            <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Keep your API secret secure. Do not expose it in client-side code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
