'use client';

import React from 'react';
import { WidgetState } from '@/types/widget';

interface MicButtonProps {
  isMuted: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function MicButton({ isMuted, onClick, disabled }: MicButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-14 h-14 rounded-full flex items-center justify-center
        transition-all duration-200 shadow-md
        ${isMuted 
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-200 dark:hover:bg-amber-900/50' 
          : 'bg-primary text-white hover:bg-primary/90'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {isMuted ? (
        <span className="material-symbols-outlined text-2xl">mic_off</span>
      ) : (
        <span className="material-symbols-outlined text-2xl">mic</span>
      )}
    </button>
  );
}