'use client';

import React, { useEffect, useState } from 'react';
import {
  useAssignPhoneNumber,
  usePhoneNumbersQuery,
  useUnassignPhoneNumber,
  useAddPhoneNumber,
  useSipTrunksQuery,
} from '@/features/telephony/hooks';
import type { PhoneNumber } from '@/features/telephony/types';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader, StatusBadge } from '@/components/ui/status-badge';
import { authService } from '@/services/auth.service';
import { SipTrunkAddModal } from './SipTrunkAddModal';
import { PhoneNumberAddModal } from './PhoneNumberAddModal';

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function statusVariant(status: PhoneNumber['status']) {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'released') return 'error';
  return 'neutral';
}

export default function PhoneNumbersPage() {
  const { data, isLoading, error, refetch } = usePhoneNumbersQuery();
  const { data: sipData } = useSipTrunksQuery();
  const assignMutation = useAssignPhoneNumber();
  const unassignMutation = useUnassignPhoneNumber();
  const [tenantId, setTenantId] = useState('');
  const [isSipModalOpen, setIsSipModalOpen] = useState(false);
  const [isAddNumberModalOpen, setIsAddNumberModalOpen] = useState(false);

  useEffect(() => {
    authService.getCurrentUser()
      .then((res: any) => setTenantId(res?.tenant?.id ?? res?.id ?? ''))
      .catch(console.error);
  }, []);

  const numbers = data?.phone_numbers ?? [];
  const activeCount = numbers.filter((n) => n.status === 'active').length;
  const assignedCount = numbers.filter((n) => n.assigned_agent_id).length;
  const totalCalls = numbers.reduce((sum, n) => sum + (n.usage?.total_calls ?? 0), 0);

  const toggleAssignment = async (number: PhoneNumber) => {
    if (number.assigned_agent_id) {
      await unassignMutation.mutateAsync(number.id);
      return;
    }

    await assignMutation.mutateAsync({
      numberId: number.id,
      agentId: tenantId,
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading phone numbers..." />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refetch} />;
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Phone Numbers"
        subtitle="Manage SIP trunks, assign numbers to agents, and track call usage."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setIsSipModalOpen(true)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[18px]">cell_tower</span>
              Add SIP Trunk
            </button>
            <button
              onClick={() => setIsAddNumberModalOpen(true)}
              className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Number
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Numbers', value: numbers.length, icon: 'sim_card' },
          { label: 'Active', value: activeCount, icon: 'check_circle' },
          { label: 'Assigned', value: assignedCount, icon: 'support_agent' },
          { label: 'Total Calls', value: totalCalls, icon: 'call' },
        ].map((item) => (
          <div key={item.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-lg flex-1 overflow-hidden flex flex-col">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.9fr_1fr_0.9fr_auto] items-center gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>Number</span>
          <span>Status</span>
          <span>Assigned Agent</span>
          <span>Usage</span>
          <span>Carrier</span>
          <span>Action</span>
        </div>

        {numbers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">sim_card_download</span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No numbers yet</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Add a SIP trunk to connect your existing phone number, or provision a new one from your carrier. Your agent will answer calls on any assigned number.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
            {numbers.map((number) => (
              <div key={number.id} className="grid grid-cols-[1.2fr_0.8fr_0.9fr_1fr_0.9fr_auto] items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white font-mono">{number.number}</p>
                  <p className="text-xs text-slate-500">{number.country_code} - {number.provider}</p>
                </div>

                <StatusBadge label={number.status} variant={statusVariant(number.status)} />

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {number.assigned_agent_name || (number.assigned_agent_id ? 'Voice Agent' : 'Unassigned')}
                  </p>
                  {number.assigned_agent_id && (
                    <p className="text-xs text-slate-400 font-mono truncate">{number.assigned_agent_id.slice(0, 8)}</p>
                  )}
                </div>

                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <p><strong>{number.usage?.calls_30d ?? 0}</strong> calls in 30d</p>
                  <p className="text-xs text-slate-500">{formatDuration(number.usage?.total_duration_seconds)} total</p>
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {number.trunk_name || 'System Default'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {number.sip_trunk_id ? (number.trunk_provider || 'SIP BYOD') : 'Leadmate Platform'}
                  </p>
                </div>

                <button
                  onClick={() => toggleAssignment(number)}
                  disabled={!tenantId || assignMutation.isPending || unassignMutation.isPending}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {number.assigned_agent_id ? 'Unassign' : 'Assign'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SIP Trunks Management Section */}
      <div className="mt-8">
        <h2 className="text-lg font-black font-headline text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">hub</span>
          Managed SIP Trunks
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sipData?.sip_trunks?.map(trunk => (
            <div key={trunk.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="material-symbols-outlined text-primary">router</span>
                </div>
                <StatusBadge 
                  label={trunk.is_active ? 'Active' : 'Inactive'} 
                  variant={trunk.is_active ? 'success' : 'neutral'} 
                />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white truncate">{trunk.name}</h3>
              <p className="text-xs text-slate-500 font-mono mt-1 truncate">{trunk.sip_host}</p>
              
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <div>
                  <p>Provider</p>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">{trunk.provider_name || 'Custom'}</p>
                </div>
                <div>
                  <p>Transport</p>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">UDP / 5060</p>
                </div>
              </div>
            </div>
          ))}
          
          <button 
            onClick={() => setIsSipModalOpen(true)}
            className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all group"
          >
            <span className="material-symbols-outlined text-3xl mb-2 group-hover:scale-110 transition-transform">add_circle</span>
            <span className="font-bold text-sm">Add New Trunk</span>
          </button>
        </div>
      </div>

      {/* Inbound Configuration Guide */}
      <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
            <span className="material-symbols-outlined text-primary">info</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Inbound SIP Configuration</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              To receive calls on your SIP numbers, point your telephony carrier (e.g. Twilio, Tata, Jio) to the following endpoint:
            </p>
            
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">SIP Server / Registrar</p>
                <p className="text-sm font-mono font-bold text-primary">sip.livekit.cloud</p>
              </div>
              <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Port / Transport</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">5060 (UDP)</p>
              </div>
              <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Context (Tenant ID)</p>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{tenantId.split('-')[0]}...</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 italic">
              Note: Since you are using LiveKit Cloud, your carrier should send SIP INVITEs to <strong>sip.livekit.cloud</strong>. 
              Leadmate will automatically dispatch these calls to your agents based on the registered numbers.
            </p>
          </div>
        </div>
      </div>

      {isSipModalOpen && <SipTrunkAddModal onClose={() => setIsSipModalOpen(false)} />}
      {isAddNumberModalOpen && (
        <PhoneNumberAddModal 
          onClose={() => setIsAddNumberModalOpen(false)} 
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
