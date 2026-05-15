'use client';

import React, { useState } from 'react';
import { useTestSipTrunk, useCreateSipTrunk } from '@/features/telephony/hooks';

interface Props {
  onClose: () => void;
}

export function SipTrunkAddModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [providerName, setProviderName] = useState('Generic');
  const [sipHost, setSipHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [transport, setTransport] = useState('udp');
  const [inboundNumber, setInboundNumber] = useState('');

  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const testTrunk = useTestSipTrunk();
  const createTrunk = useCreateSipTrunk();

  const handleTest = async () => {
    setTestSuccess(null);
    setTestError(null);
    try {
      const res = await testTrunk.mutateAsync({ sip_host: sipHost, username, password });
      if (res.success) {
        setTestSuccess(true);
      } else {
        setTestSuccess(false);
        setTestError(res.error || 'Failed to connect to SIP host.');
      }
    } catch (err: any) {
      setTestSuccess(false);
      setTestError(err.message || 'Error occurred while testing connection.');
    }
  };

  const handleSave = async () => {
    try {
      await createTrunk.mutateAsync({
        name,
        provider_name: providerName,
        sip_host: sipHost,
        username,
        password,
        transport,
        inbound_numbers: inboundNumber ? [inboundNumber] : [],
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save SIP Trunk');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black font-headline text-slate-900 dark:text-white">Add SIP Trunk</h2>
            <p className="text-sm text-slate-500 mt-1">Connect your existing telephony provider.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Trunk Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Primary Twilio Trunk"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Provider</label>
              <select
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="Generic">Generic SIP</option>
                <option value="VoiceLink">VoiceLink</option>
                <option value="Twilio">Twilio</option>
                <option value="Telnyx">Telnyx</option>
                <option value="Vonage">Vonage</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">SIP Host / Domain <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={sipHost}
              onChange={(e) => setSipHost(e.target.value)}
              placeholder="e.g. sip.example.com"
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Username (Optional)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Auth Username"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password (Optional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Auth Password"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Transport</label>
              <select
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="tls">TLS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Inbound Number (E.164)</label>
              <input
                type="text"
                value={inboundNumber}
                onChange={(e) => setInboundNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Test Status */}
          {testSuccess === true && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-sm flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/50">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <strong>Success!</strong> Connection verified via OPTIONS ping.
            </div>
          )}
          {testSuccess === false && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm flex items-start gap-2 border border-red-200 dark:border-red-800/50">
              <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
              <div>
                <strong>Connection Failed</strong>
                <p className="opacity-90">{testError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/20 rounded-b-3xl">
          <button
            type="button"
            onClick={handleTest}
            disabled={!sipHost || testTrunk.isPending}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {testTrunk.isPending ? (
              <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">cell_tower</span>
            )}
            Test Connection
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name || !sipHost || createTrunk.isPending}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {createTrunk.isPending && <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>}
              Save Trunk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
