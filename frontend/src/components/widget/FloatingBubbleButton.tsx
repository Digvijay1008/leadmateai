'use client';

import React from 'react';
import { WidgetState } from '@/types/widget';

interface FloatingBubbleButtonProps {
  state: WidgetState;
  audioLevel: number;
  onClick: () => void;
  primaryColor?: string;
}

export function FloatingBubbleButton({
  state,
  audioLevel,
  onClick,
  primaryColor = '#6366f1',
}: FloatingBubbleButtonProps) {
  const isActive = state === WidgetState.CONNECTED || state === WidgetState.MUTED;
  const isConnecting = state === WidgetState.CONNECTING;
  const isError = state === WidgetState.ERROR;

  const getButtonContent = () => {
    if (isConnecting) {
      return (
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (isError) {
      return <span className="material-symbols-outlined text-xl">error</span>;
    }

    if (state === WidgetState.ENDED) {
      return <span className="material-symbols-outlined text-xl">call_end</span>;
    }

    if (isActive) {
      return <span className="material-symbols-outlined text-xl">call</span>;
    }

    return <span className="material-symbols-outlined text-xl">phone_in_talk</span>;
  };

  const getPulseAnimation = () => {
    if (!isActive || audioLevel < 0.05) return null;

    return (
      <>
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute inset-[-8px] rounded-full opacity-10 animate-pulse"
          style={{ backgroundColor: primaryColor, transform: `scale(${1 + audioLevel * 0.5})` }}
        />
      </>
    );
  };

  return (
    <button
      onClick={onClick}
      disabled={isConnecting}
      className={`
        relative w-16 h-16 rounded-full flex items-center justify-center
        transition-all duration-500 shadow-2xl hover:scale-110 active:scale-95
        ${isActive 
          ? 'bg-emerald-500 hover:bg-emerald-600 ring-4 ring-emerald-500/20' 
          : isError 
            ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20'
            : 'hover:shadow-indigo-500/25'
        }
        ${isConnecting ? 'opacity-80 cursor-wait' : 'cursor-pointer'}
      `}
      style={{ 
        backgroundColor: isActive ? undefined : isError ? undefined : primaryColor,
        boxShadow: !isActive && !isError ? `0 10px 25px -5px ${primaryColor}40` : undefined
      }}
    >
      {getPulseAnimation()}
      <div className="text-white z-10 scale-110">
        {getButtonContent()}
      </div>
      
      {isActive && (
        <div className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
        </div>
      )}
    </button>
  );
}
