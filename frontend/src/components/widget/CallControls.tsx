'use client';

import React from 'react';
import { WidgetTheme } from '@/types/widget';
import { MicButton } from './MicButton';

interface CallControlsProps {
  isMuted: boolean;
  isActive: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  theme: WidgetTheme;
}

export function CallControls({
  isMuted,
  isActive,
  onToggleMute,
  onEndCall,
  theme,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        onClick={onToggleMute}
        disabled={!isActive}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center
          transition-all duration-200
          ${isMuted
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-200'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }
          ${!isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isMuted ? (
          <span className="material-symbols-outlined">mic_off</span>
        ) : (
          <span className="material-symbols-outlined">mic</span>
        )}
      </button>

      <button
        onClick={onEndCall}
        className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
      >
        <span className="material-symbols-outlined text-2xl">call_end</span>
      </button>

      <button
        disabled={true}
        className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center cursor-not-allowed opacity-50"
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>
    </div>
  );
}
