'use client';

import React from 'react';
import { WidgetState, WidgetTheme } from '@/types/widget';
import { WaveformVisualizer } from './WaveformVisualizer';
import { TranscriptPanel } from './TranscriptPanel';
import { CallControls } from './CallControls';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';

interface ExpandedCallPanelProps {
  state: WidgetState;
  audioLevel: number;
  transcript: { id: string; role: 'user' | 'agent'; text: string; timestamp: Date }[];
  isMuted: boolean;
  networkQuality: 'excellent' | 'good' | 'poor' | 'unknown';
  agentName: string;
  welcomeMessage: string;
  callDuration?: string;
  error: Error | null;
  errorCode: string | null;
  /** true while an automatic token refresh reconnect is running */
  isRefreshing?: boolean;
  theme: WidgetTheme;
  onToggleMute: () => void;
  onEndCall: () => void;
  onClose: () => void;
  onRetry?: () => void;
}

export function ExpandedCallPanel({
  state,
  audioLevel,
  transcript,
  isMuted,
  networkQuality,
  agentName,
  welcomeMessage,
  callDuration,
  error,
  errorCode,
  isRefreshing = false,
  theme,
  onToggleMute,
  onEndCall,
  onClose,
  onRetry,
}: ExpandedCallPanelProps) {
  const isActive = state === WidgetState.CONNECTED;
  const isMutedState = state === WidgetState.MUTED;
  const isConnecting = state === WidgetState.CONNECTING;
  const isEnded = state === WidgetState.ENDED;
  const isError = state === WidgetState.ERROR;

  const getBorderStyle = () => {
    if (theme.accentStyle === 'glass') {
      return 'backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/20';
    }
    if (theme.accentStyle === 'gradient') {
      return 'border border-transparent bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800';
    }
    return 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700';
  };

  const panelWidth =
    theme.position?.size === 'small' ? 300 : theme.position?.size === 'large' ? 420 : 360;
  const panelHeight =
    theme.position?.size === 'small' ? 400 : theme.position?.size === 'large' ? 560 : 480;

  return (
    <div
      className={`absolute ${getBorderStyle()} rounded-3xl shadow-2xl overflow-hidden flex flex-col`}
      style={{
        width: panelWidth,
        height: panelHeight,
        bottom: (theme.position?.offsetY ?? 24) + 80,
        right: theme.position?.offsetX ?? 24,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="p-4 flex items-center justify-between shrink-0"
        style={{ backgroundColor: theme.primaryColor + '12' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {agentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{agentName}</h3>
            <ConnectionStatusBadge
              state={state}
              networkQuality={networkQuality}
              isMuted={isMutedState}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Call timer */}
          {(isActive || isMutedState) && callDuration && (
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
              {callDuration}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close widget"
          >
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>
      </div>

      {/* ── Refresh banner (non-intrusive, shown on top of header) ──────── */}
      {isRefreshing && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2 flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-medium shrink-0">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Refreshing session — please stay on the call…
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* Connecting */}
        {isConnecting && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-14 h-14 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                style={{ borderColor: theme.primaryColor, borderTopColor: 'transparent' }}
              />
              <p className="text-slate-500 font-medium">Connecting to AI assistant...</p>
              <p className="text-xs text-slate-400 mt-1">Requesting microphone access</p>
            </div>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl text-red-500">
                  {errorCode === 'MIC_DENIED' ? 'mic_off' : 'error'}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                {errorCode === 'MIC_DENIED' ? 'Microphone Blocked' : 'Connection Failed'}
              </h4>
              <p className="text-sm text-slate-500 mb-2">
                {errorCode === 'MIC_DENIED'
                  ? 'Please allow microphone access in your browser settings and try again.'
                  : error?.message || 'Could not connect to the voice session.'}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        )}

        {/* Ended */}
        {isEnded && !isError && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl text-slate-400">check_circle</span>
              </div>
              <p className="text-slate-500 font-medium">Call ended</p>
              {callDuration && (
                <p className="text-xs text-slate-400 mt-1">Duration: {callDuration}</p>
              )}
            </div>
          </div>
        )}

        {/* Active / Muted */}
        {(isActive || isMutedState) && (
          <>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <WaveformVisualizer
                audioLevel={audioLevel}
                isActive={isActive && !isMutedState}
                color={theme.primaryColor}
              />
              {isActive && (
                <p className="text-sm text-slate-500 mt-2 font-medium text-center">
                  Speak now...
                </p>
              )}
              {isMutedState && (
                <p className="text-sm text-amber-600 mt-2 font-medium text-center flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">mic_off</span>
                  Microphone muted
                </p>
              )}
            </div>

            <TranscriptPanel
              transcript={transcript}
              theme={theme}
            />

            {/* Welcome message if transcript empty */}
            {transcript.length === 0 && (
              <div className="px-4 py-2 shrink-0">
                <div
                  className="text-sm rounded-2xl rounded-tl-sm px-4 py-3 font-medium"
                  style={{
                    backgroundColor: theme.primaryColor + '18',
                    color: theme.primaryColor,
                  }}
                >
                  {welcomeMessage}
                </div>
              </div>
            )}
          </>
        )}

        {/* Idle — show welcome */}
        {state === WidgetState.IDLE && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-4"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <span className="material-symbols-outlined text-2xl">mic</span>
            </div>
            <p className="text-sm font-medium text-slate-500">{welcomeMessage}</p>
          </div>
        )}
      </div>

      {/* ── Footer Controls ─────────────────────────────────────────────── */}
      {!isEnded && !isError && !isConnecting && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <CallControls
            isMuted={isMutedState}
            isActive={isActive}
            onToggleMute={onToggleMute}
            onEndCall={onEndCall}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}