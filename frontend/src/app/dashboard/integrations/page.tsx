'use client';

import React from 'react';
import { useIntegrationsQuery, useTestIntegration } from '@/features/telephony/hooks';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge, PageHeader } from '@/components/ui/status-badge';

export default function IntegrationsPage() {
  const { data: integrations = [], isLoading, error, refetch } = useIntegrationsQuery();
  const testIntegration = useTestIntegration();

  if (isLoading) {
    return <LoadingState message="Loading integrations..." />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refetch} />;
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader 
        title="Integrations" 
        subtitle="Manage third-party telelphony and infrastructure providers." 
        action={
          <button className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center gap-2">
             <span className="material-symbols-outlined text-[18px]">add</span> Add Provider
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Connected Providers</h2>
        </div>

        {integrations.length === 0 ? (
           <div className="p-12 text-center text-slate-500">
             <span className="material-symbols-outlined text-4xl mb-4 text-slate-400">api</span>
             <p className="font-medium text-slate-900 dark:text-white mb-2">No integrations found</p>
             <p className="text-sm">Connect your SIP trunk or a provider like Twilio, Telnyx, or any standard SIP to get started.</p>
           </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {integrations.map((provider) => (
              <div key={provider.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">{provider.icon || 'settings_input_component'}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">{provider.name}</h3>
                      <StatusBadge 
                        label={provider.status === 'connected' ? 'Connected' : provider.status === 'error' ? 'Error' : 'Disconnected'} 
                        variant={provider.status === 'connected' ? 'success' : provider.status === 'error' ? 'error' : 'neutral'} 
                      />
                    </div>
                    <p className="text-sm text-slate-500">{provider.description}</p>
                    {provider.last_connected_at && (
                       <p className="text-xs text-slate-400 mt-1">Last synced: {new Date(provider.last_connected_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => testIntegration.mutate(provider.id)}
                    disabled={testIntegration.isPending}
                    className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {testIntegration.isPending && testIntegration.variables === provider.id ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined text-xl">more_vert</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
