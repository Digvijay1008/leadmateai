'use client';

import React, { useEffect, useState } from 'react';
import {
  useAssignPhoneNumber,
  usePhoneNumbersQuery,
  useUnassignPhoneNumber,
} from '@/features/telephony/hooks';
import type { PhoneNumber } from '@/features/telephony/types';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader, StatusBadge } from '@/components/ui/status-badge';
import { authService } from '@/services/auth.service';
import { SipTrunkAddModal } from './SipTrunkAddModal';

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
  const assignMutation = useAssignPhoneNumber();
  const unassignMutation = useUnassignPhoneNumber();
  const [tenantId, setTenantId] = useState('');
  const [isSipModalOpen, setIsSipModalOpen] = useState(false);

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
        subtitle="Manage provisioned numbers, routing, assignment, and usage."
        action={
          <button
            onClick={() => setIsSipModalOpen(true)}
            className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">cell_tower</span>
            Add SIP Trunk
          </button>
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
              Add a SIP trunk with inbound numbers or provision numbers from your carrier to route calls into LeadMate.
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
                    {number.trunk_name || 'Default'}
                  </p>
                  <p className="text-xs text-slate-500">{number.trunk_provider || 'SIP'}</p>
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

      {isSipModalOpen && <SipTrunkAddModal onClose={() => setIsSipModalOpen(false)} />}
    </div>
  );
}
