'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSessionsQuery } from '@/features/sessions/hooks';
import { callsApi } from '@/services/calls.api';
import { liveKitService } from '@/services/livekit.service';
import { Room } from 'livekit-client';
import { WidgetState, ConnectionState, TranscriptEntry } from '@/types/widget';
import { TranscriptPanel } from '@/components/widget/TranscriptPanel';

type CallState = 'idle' | 'dialing' | 'ringing' | 'connected' | 'ended' | 'failed' | 'error';

export default function DialerPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callState, setCallState] = useState<CallState>('idle');
  const [callUuid, setCallUuid] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Devices
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');

  // LiveKit state
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const { data: sessionData, refetch } = useSessionsQuery({ period: '7days' });
  const recentSessions = sessionData?.sessions?.slice(0, 5) || [];

  useEffect(() => {
    const phone = new URLSearchParams(window.location.search).get('phone');
    if (phone) setPhoneNumber(phone);

    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      setAudioInputs(inputs);
      setAudioOutputs(outputs);
      if (inputs.length > 0) setSelectedMic(inputs[0].deviceId);
      if (outputs.length > 0) setSelectedSpeaker(outputs[0].deviceId);
    }).catch(console.error);
  }, []);

  const handleState = useCallback((state: ConnectionState) => {
    if (state.state === WidgetState.CONNECTED) setCallState('connected');
    else if (state.state === WidgetState.ENDED) setCallState('ended');
    else if (state.state === WidgetState.ERROR) {
      setCallState('error');
      setErrorMsg(state.error || 'Connection error');
    }
  }, []);

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript(prev => [...prev, entry]);
  }, []);

  const handleCall = async () => {
    if (!phoneNumber || phoneNumber.length < 5) {
      setErrorMsg('Please enter a valid phone number');
      return;
    }
    try {
      setCallState('dialing');
      setErrorMsg('');
      setTranscript([]);
      
      const res = await callsApi.startOutboundCall({ to: phoneNumber });
      if (res.success) {
        setCallUuid(res.call_uuid);
        setCallState('ringing');
        
        // Connect to LiveKit Room
        const room = await liveKitService.connect(
          res.livekit_token,
          res.livekit_url,
          handleState,
          handleTranscript,
          setAudioLevel,
          () => {} // Reconnect needed
        );

        if (selectedMic) await room.switchActiveDevice('audioinput', selectedMic);
        if (selectedSpeaker) await room.switchActiveDevice('audiooutput', selectedSpeaker);

      } else {
        setCallState('failed');
        setErrorMsg('API returned failure for outbound call');
      }
    } catch (e: any) {
      setCallState('failed');
      setErrorMsg(e.message || 'Failed to initiate outbound call');
    }
  };

  const handleHangup = async () => {
    await liveKitService.disconnect();
    setCallState('ended');
    setCallUuid(null);
    setPhoneNumber('');
    setTimeout(() => {
      setCallState('idle');
      setTranscript([]);
      refetch();
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col gap-6 max-w-5xl mx-auto">
      <header className="shrink-0">
        <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">Outbound Dialer</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Initiate manual calls via your AI Agent directly from the dashboard.</p>
      </header>

      {/* Device Management */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex gap-4 shrink-0">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Microphone</label>
          <select 
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={selectedMic}
            onChange={(e) => setSelectedMic(e.target.value)}
            disabled={callState === 'connected' || callState === 'dialing' || callState === 'ringing'}
          >
            {audioInputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Speaker</label>
          <select 
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={selectedSpeaker}
            onChange={(e) => setSelectedSpeaker(e.target.value)}
            disabled={callState === 'connected' || callState === 'dialing' || callState === 'ringing'}
          >
            {audioOutputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 5)}...`}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 items-start min-h-[400px]">
        {/* Dialer UI */}
        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden transition-all h-full">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/50 to-transparent dark:from-indigo-900/10 dark:to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-6 items-center">
            <div className="w-full text-center">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                callState === 'idle' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                callState === 'dialing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse' :
                callState === 'ringing' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 animate-pulse' :
                callState === 'connected' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                callState === 'failed' || callState === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${callState === 'connected' || callState === 'dialing' || callState === 'ringing' ? 'bg-current' : 'bg-current'}`} />
                {callState.charAt(0).toUpperCase() + callState.slice(1)}
              </div>
            </div>

            <div className="w-full">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
              <div className="relative">
                <input 
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4 text-2xl font-light text-center focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-headline"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  disabled={callState === 'dialing' || callState === 'ringing' || callState === 'connected'}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg w-full text-center">
                {errorMsg}
              </div>
            )}

            {callState === 'connected' && (
              <div className="w-full mt-2 h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative flex items-center justify-center">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-emerald-500/30 transition-all duration-100 ease-linear" 
                  style={{ width: `${Math.min(100, audioLevel * 100 * 2)}%` }} 
                />
                <span className="relative text-[10px] font-bold text-slate-500 uppercase tracking-wider z-10">Audio Level</span>
              </div>
            )}

            <div className="w-full mt-4 flex justify-center gap-4">
              {(callState === 'idle' || callState === 'failed' || callState === 'ended' || callState === 'error') ? (
                <button 
                  onClick={handleCall}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="material-symbols-outlined text-3xl">call</span>
                </button>
              ) : (
                <button 
                  onClick={handleHangup}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="material-symbols-outlined text-3xl">call_end</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Transcript or Logs UI */}
        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full max-h-[500px]">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">
              {callState === 'connected' ? 'Live Transcript' : 'Recent Outbound Logs'}
            </h3>
          </div>
          
          <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-950/50">
            {callState === 'connected' ? (
               <TranscriptPanel transcript={transcript} theme={{ primaryColor: '#6366f1', backgroundColor: 'transparent', textColor: '#1e293b', borderRadius: 16, accentStyle: 'gradient' }} />
            ) : recentSessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">history</span>
                <p className="text-sm font-medium">No recent calls found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((session, i) => (
                  <div key={session.id || i} className="p-4 rounded-xl hover:bg-white dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-sm">call_made</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Outbound Call</p>
                        <p className="text-xs text-slate-500">{session.duration_seconds}s duration</p>
                      </div>
                    </div>
                    <div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        session.status === 'completed' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : session.status === 'active'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
