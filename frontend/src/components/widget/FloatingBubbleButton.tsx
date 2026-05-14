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
    if (!isActive) return null;

    const scale = 1 + audioLevel * 0.3;
    return (
      <div
        className="absolute inset-0 rounded-full animate-ping opacity-75"
        style={{
          backgroundColor: primaryColor,
          transform: `scale(${scale})`,
        }}
      />
    );
  };

  return (
    <button
      onClick={onClick}
      disabled={isConnecting}
      className={`
        relative w-16 h-16 rounded-full flex items-center justify-center
        transition-all duration-300 shadow-lg
        ${isActive 
          ? 'bg-emerald-500 hover:bg-emerald-600' 
          : isError 
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-primary hover:scale-110'
        }
        ${isConnecting ? 'opacity-80 cursor-wait' : 'cursor-pointer'}
      `}
      style={{ backgroundColor: isActive ? undefined : primaryColor }}
    >
      {getPulseAnimation()}
      <div className="text-white z-10">{getButtonContent()}</div>
      
      {isActive && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  );
}