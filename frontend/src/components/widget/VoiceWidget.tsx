'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceWidget } from '@/hooks/useVoiceWidget';
import { WidgetState, WidgetConfig, WidgetTheme, WidgetPosition, DEFAULT_WIDGET_CONFIG } from '@/types/widget';
import { FloatingBubbleButton } from './FloatingBubbleButton';
import { ExpandedCallPanel } from './ExpandedCallPanel';

interface VoiceWidgetProps {
  tenantId: string;
  config?: Partial<WidgetConfig>;
  embedded?: boolean;
  previewMode?: boolean;
  onStateChange?: (state: WidgetState) => void;
  onExpandToggle?: (expanded: boolean) => void;
}

export function VoiceWidget({
  tenantId,
  config,
  embedded = false,
  previewMode = false,
  onStateChange,
  onExpandToggle,
}: VoiceWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const setExpandedWithCallback = useCallback((val: boolean) => {
    setIsExpanded(val);
    if (onExpandToggle) onExpandToggle(val);
  }, [onExpandToggle]);

  const widgetConfig: Partial<WidgetConfig> = {
    ...DEFAULT_WIDGET_CONFIG,
    ...config,
    theme: {
      ...DEFAULT_WIDGET_CONFIG.theme,
      ...config?.theme,
    },
    position: {
      ...DEFAULT_WIDGET_CONFIG.position,
      ...config?.position,
    },
  };

  const {
    state,
    connectionState,
    transcript,
    error,
    errorCode,
    isRefreshing,
    isTimerPaused,
    connect,
    disconnect,
    toggleMute,
    audioLevel,
    agentAudioLevel,
  } = useVoiceWidget({
    tenantId,
    config: widgetConfig,
    onStateChange,
  });

  // ─── Call timer ─────────────────────────────────────────────────────────
  // • Increments while CONNECTED or MUTED.
  // • PAUSED (interval cleared, counter preserved) during RECONNECTING.
  // • Reset to 0 only when returning to IDLE.
  const [callSeconds, setCallSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any existing interval first to prevent duplicates
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const isActive = state === WidgetState.CONNECTED || state === WidgetState.MUTED;

    if (isActive && !isTimerPaused) {
      // Start or resume
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setCallSeconds(accumulatedTimeRef.current + elapsed);
        }
      }, 1000);
    } else {
      if (state === WidgetState.RECONNECTING) {
        // Pause: capture elapsed and reset start
        if (startTimeRef.current) {
          accumulatedTimeRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
          startTimeRef.current = null;
        }
      } else if (state === WidgetState.IDLE) {
        // Reset
        setCallSeconds(0);
        startTimeRef.current = null;
        accumulatedTimeRef.current = 0;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, isTimerPaused]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleBubbleClick = useCallback(async () => {
    if (isExpanded) {
      if (state === WidgetState.CONNECTED || state === WidgetState.MUTED) {
        await disconnect();
      }
      setExpandedWithCallback(false);
    } else {
      setExpandedWithCallback(true);
      if (state === WidgetState.IDLE || state === WidgetState.ERROR) {
        await connect();
      }
    }
  }, [isExpanded, state, connect, disconnect]);

  const handleClose = useCallback(async () => {
    if (state === WidgetState.CONNECTED || state === WidgetState.MUTED) {
      await disconnect();
    }
    setExpandedWithCallback(false);
  }, [state, disconnect, setExpandedWithCallback]);

  const handleEndCall = useCallback(async () => {
    await disconnect();
    setExpandedWithCallback(false);
  }, [disconnect, setExpandedWithCallback]);

  const handleRetry = useCallback(async () => {
    await connect();
  }, [connect]);

  // ─── Layout ────────────────────────────────────────────────────────────────

  const position = widgetConfig.position ?? DEFAULT_WIDGET_CONFIG.position;
  const theme = widgetConfig.theme ?? DEFAULT_WIDGET_CONFIG.theme;

  const containerClass = embedded ? 'relative w-full h-full' : (previewMode ? 'absolute z-50' : 'fixed z-50');

  const getPositionStyle = (): React.CSSProperties => {
    const offsetX = position?.offsetX ?? 24;
    const offsetY = position?.offsetY ?? 24;
    switch (position?.corner) {
      case 'top-left':    return { top: offsetY, left: offsetX };
      case 'top-right':   return { top: offsetY, right: offsetX };
      case 'bottom-left': return { bottom: offsetY, left: offsetX };
      default:            return { bottom: offsetY, right: offsetX };
    }
  };

  return (
    <div className={containerClass} style={!embedded ? getPositionStyle() : undefined}>
      {isExpanded && (
        <ExpandedCallPanel
          state={state}
          audioLevel={audioLevel}
          agentAudioLevel={agentAudioLevel}
          isAgentSpeaking={connectionState.isAgentSpeaking}
          transcript={transcript}
          isMuted={state === WidgetState.MUTED}
          networkQuality={connectionState.networkQuality}
          agentName={widgetConfig.agentName || 'AI Assistant'}
          welcomeMessage={widgetConfig.welcomeMessage || 'Hello! How can I help you?'}
          callDuration={formatTime(callSeconds)}
          error={error}
          errorCode={errorCode}
          isRefreshing={isRefreshing}
          theme={{
            ...theme,
            position: position!,
          } as WidgetTheme}
          onToggleMute={toggleMute}
          onEndCall={handleEndCall}
          onClose={handleClose}
          onRetry={handleRetry}
        />
      )}

      {!embedded && (
        <FloatingBubbleButton
          state={state}
          audioLevel={Math.max(audioLevel, agentAudioLevel)}
          onClick={handleBubbleClick}
          primaryColor={theme?.primaryColor}
        />
      )}

      {embedded && state === WidgetState.IDLE && (
        <button
          onClick={handleBubbleClick}
          className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white font-bold hover:from-indigo-600 hover:to-purple-700 transition-all"
        >
          <span className="material-symbols-outlined mr-2">phone_in_talk</span>
          Start Voice Chat
        </button>
      )}

      {embedded && state === WidgetState.ERROR && (
        <button
          onClick={handleRetry}
          className="w-full h-full flex flex-col items-center justify-center bg-red-50 rounded-2xl text-red-600 font-bold gap-2"
        >
          <span className="material-symbols-outlined text-3xl">error</span>
          <span className="text-sm">{errorCode === 'MIC_DENIED' ? 'Microphone Access Denied' : 'Connection Failed'}</span>
          <span className="text-xs text-red-400 underline">Tap to retry</span>
        </button>
      )}
    </div>
  );
}

export default VoiceWidget;
