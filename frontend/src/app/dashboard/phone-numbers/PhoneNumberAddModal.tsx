'use client';

import React, { useState } from 'react';
import { useSipTrunksQuery, useAddPhoneNumber } from '@/features/telephony/hooks';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function PhoneNumberAddModal({ onClose, onSuccess }: Props) {
  const [number, setNumber] = useState('');
  const [sipTrunkId, setSipTrunkId] = useState('');
  
  const { data: sipData } = useSipTrunksQuery();
  const addMutation = useAddPhoneNumber();

  const handleSave = async () => {
    if (!number) return;
    try {
      await addMutation.mutateAsync({
        number,
        sip_trunk_id: sipTrunkId || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to add number');
    }
  };

  const trunks = sipData?.sip_trunks ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black font-headline text-slate-900 dark:text-white">Add Phone Number</h2>
            <p className="text-sm text-slate-500 mt-1">Register a new number from your SIP trunk.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Phone Number (E.164)</label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. +919876543210"
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">info</span>
              Must include country code (e.g. +91 for India)
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Associated SIP Trunk</label>
            <select
              value={sipTrunkId}
              onChange={(e) => setSipTrunkId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              <option value="">No Trunk (System Default)</option>
              {trunks.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.sip_host})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-800/20 rounded-b-3xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!number || addMutation.isPending}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-primary text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {addMutation.isPending && <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>}
            Add Number
          </button>
        </div>
      </div>
    </div>
  );
}
