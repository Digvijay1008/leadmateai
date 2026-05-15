'use client';

import React, { useState } from 'react';
import { useSessionsQuery, useSessionDetailQuery } from '@/features/sessions/hooks';
import { VirtualList } from '@/components/ui/virtual-list';
import type { Session, SessionFilters, TranscriptSegment } from '@/features/sessions/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getStatusStyle(status: Session['status']): string {
  const map: Record<Session['status'], string> = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-emerald-500/20',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-500/20',
    connected: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-500/20 animate-pulse',
    ringing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 ring-1 ring-indigo-500/20 animate-pulse',
    dialing: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 ring-1 ring-indigo-500/10',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-1 ring-red-500/20',
    missed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 ring-1 ring-rose-500/20',
    timeout: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-1 ring-amber-500/20',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-500/20',
    max_duration: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-1 ring-purple-500/20',
    insufficient_funds: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 ring-1 ring-orange-500/20',
  };
  return map[status] ?? 'bg-slate-100 text-slate-600';
}

function getStatusLabel(status: Session['status']): string {
  const map: Record<Session['status'], string> = {
    completed: 'Completed',
    active: 'Live',
    connected: 'Connected',
    ringing: 'Ringing',
    dialing: 'Dialing',
    failed: 'Failed',
    missed: 'Missed',
    timeout: 'Timeout',
    cancelled: 'Cancelled',
    max_duration: 'Max Duration',
    insufficient_funds: 'Low Balance',
  };
  return map[status] ?? status;
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
      </div>
      <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
      <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded" />
    </div>
  );
}

// ─── Waveform Player ──────────────────────────────────────────────────────────

function WaveformPlayer({ audioUrl }: { audioUrl: string }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play(); }
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoad = () => setDuration(audio.duration);
    const onEnd = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoad);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoad);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const progress = duration ? currentTime / duration : 0;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // 40 fake waveform bars — visually driven by progress
  const bars = Array.from({ length: 40 }, (_, i) => {
    const height = 20 + Math.abs(Math.sin(i * 0.8) * 24 + Math.cos(i * 1.3) * 16);
    const filled = i / 40 < progress;
    return { height, filled };
  });

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 mb-4 shrink-0">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      {/* Waveform */}
      <div
        className="flex items-center gap-[2px] h-12 mb-3 cursor-pointer"
        onClick={seek}
        title="Click to seek"
      >
        {bars.map((bar, i) => (
          <div
            key={i}
            style={{ height: `${bar.height}px` }}
            className={`flex-1 rounded-full transition-colors ${
              bar.filled
                ? 'bg-primary'
                : playing
                ? 'bg-slate-300 dark:bg-slate-600 animate-pulse'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>
      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">{playing ? 'pause' : 'play_arrow'}</span>
        </button>
        <span className="text-xs font-mono text-slate-500 tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

// ─── Transcript Panel ─────────────────────────────────────────────────────────

function TranscriptPanel({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { data: session, isLoading } = useSessionDetailQuery(sessionId);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  // Seek audio to a specific second when user clicks a transcript line
  const seekTo = (timestampMs?: number) => {
    if (!audioRef.current || timestampMs === undefined) return;
    audioRef.current.currentTime = timestampMs / 1000;
    audioRef.current.play();
  };

  const audioUrl: string | undefined = (session as any)?.audio_url ?? (session as any)?.recording_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Session Transcript</h2>
            {session && (
              <p className="text-xs text-slate-500 mt-0.5">
                {formatDuration(session.duration_seconds)} · {new Date(session.created_at).toLocaleString()}
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Audio player with waveform */}
        {audioUrl && (
          <div className="px-6 pt-4 shrink-0">
            <WaveformPlayer audioUrl={audioUrl} />
            {/* Hidden audio ref for transcript seek */}
            <audio ref={audioRef} src={audioUrl} className="hidden" />
          </div>
        )}

        {/* Summary */}
        {session?.transcript_summary && (
          <div className="px-6 py-3 bg-primary/5 border-b border-primary/10 shrink-0">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">AI Summary</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{session.transcript_summary}</p>
          </div>
        )}

        {/* Session meta */}
        {session && (
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
             <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
               <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Direction</p>
                 <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-medium">
                   <span className="material-symbols-outlined text-[16px] text-slate-400">
                     {session.direction === 'outbound' ? 'call_made' : 'call_received'}
                   </span>
                   <span className="capitalize">{session.direction || 'Inbound'}</span>
                 </div>
               </div>
               <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Outcome</p>
                 <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-medium">
                   <span className={`w-2 h-2 rounded-full ${session.status === 'completed' ? 'bg-emerald-500' : session.status === 'missed' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                   <span className="capitalize">{session.end_reason || session.status}</span>
                 </div>
               </div>
               <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Agent</p>
                 <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-medium">
                   <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                     {(session.agent_identity || 'A').charAt(0)}
                   </div>
                   <span>{session.agent_identity || 'AI Assistant'}</span>
                 </div>
               </div>
               <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Timeline</p>
                 <div className="text-slate-900 dark:text-white font-medium whitespace-nowrap">
                   {session.created_at ? new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                   <span className="text-slate-400 mx-1">→</span>
                   {session.ended_at ? new Date(session.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* Transcript bubbles */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex gap-3 animate-pulse ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="h-10 rounded-2xl bg-slate-200 dark:bg-slate-700 flex-1" />
                </div>
              ))}
            </div>
          ) : !session?.transcript || session.transcript.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">chat_bubble_outline</span>
              <p className="text-sm font-medium text-slate-500">No transcript available for this session.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {(session.transcript as TranscriptSegment[]).map((turn, i) => (
                <div
                  key={turn.id ?? i}
                  className={`flex gap-3 py-1.5 ${turn.role === 'agent' ? '' : 'flex-row-reverse'}`}
                >
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                    turn.role === 'agent'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {turn.role === 'agent' ? 'AI' : 'U'}
                  </div>
                  <div className="max-w-[80%] flex flex-col gap-1">
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      turn.role === 'agent'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                        : 'bg-primary text-white rounded-tr-sm'
                    }`}>
                      {turn.text}
                    </div>
                    {/* Timestamp: click to jump audio */}
                    {(turn as any).timestamp_ms !== undefined && audioUrl && (
                      <button
                        onClick={() => seekTo((turn as any).timestamp_ms)}
                        className={`text-[10px] font-mono px-1 text-slate-400 hover:text-primary transition-colors self-start flex items-center gap-0.5 ${
                          turn.role !== 'agent' ? 'self-end' : ''
                        }`}
                        title="Jump to this point in recording"
                      >
                        <span className="material-symbols-outlined text-[12px]">play_circle</span>
                        {Math.floor(((turn as any).timestamp_ms ?? 0) / 1000)}s
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CallsPage() {
  const [period, setPeriod] = useState<SessionFilters['period']>('7days');
  const [direction, setDirection] = useState<SessionFilters['direction']>('all');
  const [page, setPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const PAGE_SIZE = 20;
  const { data, isLoading, error, refetch } = useSessionsQuery({
    period,
    direction,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Summary stats
  const completedCount = sessions.filter(s => s.status === 'completed').length;
  const failedCount = sessions.filter(s => s.status === 'failed' || s.status === 'timeout' || s.status === 'missed').length;
  const liveCount = sessions.filter(s => s.status === 'active' || s.status === 'connected' || s.status === 'ringing' || s.status === 'dialing').length;
  
  const avgDuration = sessions.length
    ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / sessions.length)
    : 0;
  const totalCost = sessions.reduce((sum, s) => sum + (s.total_cost ?? s.cost_total ?? 0), 0);

  const periodLabels = {
    '7days': 'Last 7 Days',
    '30days': 'Last 30 Days',
    '90days': 'Last 90 Days',
    'all': 'All Time',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">
            Call Sessions
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            View transcripts, monitor live calls, and analyze interactions.
          </p>
        </div>
        <div className="flex gap-3 relative">
           <div className="flex p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
             {(['all', 'inbound', 'outbound'] as const).map((value) => (
               <button
                 key={value}
                 onClick={() => { setDirection(value); setPage(1); }}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                   direction === value
                     ? 'bg-primary text-white'
                     : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                 }`}
               >
                 {value}
               </button>
             ))}
           </div>
           <button 
             onClick={() => setIsFilterOpen(!isFilterOpen)}
             className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
           >
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              {period ? periodLabels[period] : 'Filter by date'}
              <span className="material-symbols-outlined text-[18px] text-slate-400">expand_more</span>
           </button>
           
           {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden z-20 py-1">
                {(['7days', '30days', '90days', 'all'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => { setPeriod(r); setPage(1); setIsFilterOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${period === r ? 'bg-primary/5 text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    {periodLabels[r]}
                  </button>
                ))}
              </div>
           )}
        </div>
      </header>

      {/* Summary KPIs */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Sessions', value: total, icon: 'call', color: 'text-primary' },
            { 
              label: 'Active Calls', 
              value: liveCount, 
              icon: 'settings_phone', 
              color: 'text-indigo-500',
              pulse: liveCount > 0
            },
            { label: 'Completed', value: completedCount, icon: 'check_circle', color: 'text-emerald-500' },
            { label: 'Failed / Missed', value: failedCount, icon: 'cancel', color: 'text-rose-500' },
          ].map(({ label, value, icon, color, pulse }) => (
            <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 shrink-0 relative`}>
                {pulse && <span className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-full animate-ping opacity-75"></span>}
                {pulse && <span className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
                <span className={`material-symbols-outlined text-[24px] ${color}`}>{icon}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {isLoading ? 'Loading…' : `${(total ?? 0).toLocaleString()} session${total !== 1 ? 's' : ''}`}
          </p>
          {totalCost > 0 && (
            <p className="text-xs text-slate-500">
              Period cost: <strong className="text-slate-900 dark:text-white">${totalCost.toFixed(3)}</strong>
            </p>
          )}
        </div>

        {isLoading ? (
          <div>{Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-red-400 mb-3 block">wifi_off</span>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">{error.message}</p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">headphones</span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Calls Yet</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              Once your AI agent starts interacting with leads, call sessions will appear here with full transcripts.
            </p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
              <span>#</span>
              <span>Session</span>
              <span>Number</span>
              <span>Duration</span>
              <span>Cost</span>
              <span>Status</span>
              <span>Transcript</span>
            </div>

            <div className="flex-1 overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.map((session, index) => (
                <div
                  key={session.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Index */}
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[16px]">call</span>
                  </div>

                  {/* Session info */}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      Voice Session #{(page - 1) * PAGE_SIZE + index + 1}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {session.agent_identity ?? 'AI Agent'} ·{' '}
                      {session.created_at ? new Date(session.created_at).toLocaleString() : '—'}
                    </p>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    <p className="font-mono">{session.phone_number || '-'}</p>
                    {session.lead_id && (
                      <a
                        href={`/dashboard/leads/${session.lead_id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        Linked lead
                      </a>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="flex flex-col items-start justify-center">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatDuration(session.duration_seconds)}
                    </span>
                    {session.direction === 'inbound' ? (
                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">call_received</span> IN</span>
                    ) : (
                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">call_made</span> OUT</span>
                    )}
                  </div>

                  {/* Cost */}
                  <span className="text-sm text-slate-500 tabular-nums font-mono" title="Based on total duration & provider rates">
                    ${(session.total_cost ?? session.cost_total ?? 0).toFixed(3)}
                  </span>

                  {/* Status */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusStyle(session.status)}`}>
                    {getStatusLabel(session.status)}
                  </span>

                  {/* Transcript button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSession(session.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[14px]">chat</span>
                      View
                    </button>
                    {(session.status === 'failed' || session.status === 'timeout' || session.status === 'missed') && (
                      <button
                        onClick={() => { window.location.href = '/dashboard/dialer?phone=' + encodeURIComponent(session.phone_number || ''); }}
                        disabled={!session.phone_number}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center gap-1 shadow-sm"
                        title="Retry Call"
                      >
                        <span className="material-symbols-outlined text-[14px]">replay</span>
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                <p className="text-sm text-slate-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of <strong>{total}</strong>
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transcript slide-over panel */}
      {selectedSession && (
        <TranscriptPanel sessionId={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}
