'use client';

import React from 'react';
import { WidgetState } from '@/types/widget';

interface ConnectionStatusBadgeProps {
  state: WidgetState;
  networkQuality: 'excellent' | 'good' | 'poor' | 'unknown';
  isMuted?: boolean;
}

export function ConnectionStatusBadge({ state, networkQuality, isMuted = false }: ConnectionStatusBadgeProps) {
  const getStatusColor = () => {
    if (isMuted) return 'bg-amber-500';
    
    switch (state) {
      case WidgetState.CONNECTED:
        return networkQuality === 'excellent' ? 'bg-emerald-500' : 'bg-yellow-500';
      case WidgetState.CONNECTING:
        return 'bg-blue-500 animate-pulse';
      case WidgetState.ERROR:
        return 'bg-red-500';
      case WidgetState.ENDED:
        return 'bg-slate-400';
      default:
        return 'bg-slate-400';
    }
  };

  const getStatusText = () => {
    if (isMuted) return 'Muted';
    
    switch (state) {
      case WidgetState.CONNECTED:
        return networkQuality === 'excellent' ? 'Connected' : 'Connected';
      case WidgetState.CONNECTING:
        return 'Connecting...';
      case WidgetState.MUTED:
        return 'Muted';
      case WidgetState.ERROR:
        return 'Error';
      case WidgetState.ENDED:
        return 'Ended';
      default:
        return 'Idle';
    }
  };

  const getNetworkIcon = () => {
    if (isMuted) return 'mic_off';
    
    switch (networkQuality) {
      case 'excellent':
        return 'signal_cellular_4_bar';
      case 'good':
        return 'signal_cellular_alt';
      case 'poor':
        return 'signal_cellular_alt_1_bar';
      default:
        return 'signal_cellular_null';
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
        <span className="material-symbols-outlined text-xs">{getNetworkIcon()}</span>
        {getStatusText()}
      </span>
    </div>
  );
}