'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  WidgetState,
  WidgetConfig,
  ConnectionState,
  TranscriptEntry,
  isValidTransition,
  DEFAULT_WIDGET_CONFIG,
} from '@/types/widget';
import { liveKitService, ReconnectReason } from '@/services/livekit.service';

// ─── Hook interfaces ──────────────────────────────────────────────────────────

interface UseVoiceWidgetOptions {
  tenantId: string;
  config?: Partial<WidgetConfig>;
  onStateChange?: (state: WidgetState) => void;
  onTranscriptUpdate?: (transcript: TranscriptEntry[]) => void;
  onError?: (error: Error) => void;
}

interface UseVoiceWidgetReturn {
  state: WidgetState;
  connectionState: ConnectionState;
  transcript: TranscriptEntry[];
  config: WidgetConfig;
  error: Error | null;
  errorCode: string | null;
  /** true while an automatic token refresh + reconnect is in progress */
  isRefreshing: boolean;
  /**
   * true when the FSM is in RECONNECTING state.
   * Consumers should pause the call timer while this is true.
   */
  isTimerPaused: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => Promise<void>;
  updateConfig: (updates: Partial<WidgetConfig>) => void;
  audioLevel: number;
  agentAudioLevel: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateSessionId = () =>
  `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const INITIAL_CONNECTION_STATE: ConnectionState = {
  state: WidgetState.IDLE,
  participantCount: 0,
  audioEnabled: false,
  networkQuality: 'unknown',
};

const SESSION_LOCK_KEY = 'leadmate_voice_session_active';
const SESSION_LOCK_EXPIRY = 5000; // 5 seconds grace for tab crashes

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceWidget(options: UseVoiceWidgetOptions): UseVoiceWidgetReturn {
  const { tenantId, config: initialConfig, onStateChange, onTranscriptUpdate, onError } = options;

  const [state, setState]                   = useState<WidgetState>(WidgetState.IDLE);
  const [connectionState, setConnectionState] = useState<ConnectionState>(INITIAL_CONNECTION_STATE);
  const [transcript, setTranscript]         = useState<TranscriptEntry[]>([]);
  const [error, setError]                   = useState<Error | null>(null);
  const [errorCode, setErrorCode]           = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [isTimerPaused, setIsTimerPaused]   = useState(false);
  const [audioLevel, setAudioLevel]         = useState(0);
  const [agentAudioLevel, setAgentAudioLevel] = useState(0);
  const [config, setConfig]                 = useState<WidgetConfig>(() => ({
    ...DEFAULT_WIDGET_CONFIG,
    ...initialConfig,
    id: generateSessionId(),
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const isMountedRef = useRef(true);
  const stateRef     = useRef<WidgetState>(WidgetState.IDLE);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // ─── Session Locking ───────────────────────────────────────────────────────

  const checkSessionLock = useCallback(() => {
    const lock = localStorage.getItem(SESSION_LOCK_KEY);
    if (lock) {
      const { timestamp, tabId } = JSON.parse(lock);
      // If lock is fresh (< 5s) and not from this tab (we don't have tabId yet so let's use a random one)
      if (Date.now() - timestamp < SESSION_LOCK_EXPIRY) {
        return false;
      }
    }
    return true;
  }, []);

  const acquireSessionLock = useCallback(() => {
    localStorage.setItem(SESSION_LOCK_KEY, JSON.stringify({
      timestamp: Date.now(),
      tabId: Math.random().toString(36).slice(2)
    }));
  }, []);

  const releaseSessionLock = useCallback(() => {
    localStorage.removeItem(SESSION_LOCK_KEY);
  }, []);

  // Heartbeat to keep lock alive
  useEffect(() => {
    if (state === WidgetState.CONNECTED || state === WidgetState.MUTED || state === WidgetState.RECONNECTING) {
      const interval = setInterval(acquireSessionLock, 3000);
      return () => clearInterval(interval);
    }
  }, [state, acquireSessionLock]);

  // ─── Mount guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ─── FSM transition — O(1) lookup ─────────────────────────────────────────

  const transitionTo = useCallback(
    (newState: WidgetState): boolean => {
      const current = stateRef.current;
      if (!isValidTransition(current, newState)) {
        console.warn(`[FSM] Blocked: ${current} → ${newState}`);
        return false;
      }
      stateRef.current = newState;
      setState(newState);
      setConnectionState((prev) => ({ ...prev, state: newState }));
      onStateChange?.(newState);

      // ── Timer control ───────────────────────────────────────────────────
      // Pause the timer during RECONNECTING; resume on CONNECTED / MUTED.
      // The VoiceWidget reads `isTimerPaused` and skips incrementing while true.
      setIsTimerPaused(newState === WidgetState.RECONNECTING);

      return true;
    },
    [onStateChange]
  );

  // ─── Transcript handler ───────────────────────────────────────────────────
  // NOTE: never cleared on reconnect — preserves full conversation history

  const handleTranscriptEntry = useCallback(
    (entry: TranscriptEntry) => {
      if (!isMountedRef.current) return;

      // ── Deduplication ─────────────────────────────────────────────────────
      // We deduplicate by content + role + timestamp (within 2s) 
      // if an explicit ID is not unique enough.
      const dedupKey = `${entry.role}:${entry.text.trim()}`;
      if (processedMessageIds.current.has(dedupKey)) {
        return;
      }
      processedMessageIds.current.add(dedupKey);
      // Keep set size manageable
      if (processedMessageIds.current.size > 100) {
        const firstValue = processedMessageIds.current.values().next().value;
        if (firstValue !== undefined) processedMessageIds.current.delete(firstValue);
      }

      setTranscript((prev) => {
        const updated = [...prev, entry];
        onTranscriptUpdate?.(updated);
        return updated;
      });
    },
    [onTranscriptUpdate]
  );

  // ─── Audio level handler ──────────────────────────────────────────────────

  const handleAudioLevel = useCallback((userLevel: number, agentLevel: number) => {
    if (isMountedRef.current) {
      setAudioLevel(userLevel);
      setAgentAudioLevel(agentLevel);
    }
  }, []);

  // ─── Service state sync ───────────────────────────────────────────────────

  const handleServiceStateChange = useCallback(
    (incoming: ConnectionState) => {
      if (!isMountedRef.current) return;
      setConnectionState(incoming);

      switch (incoming.state) {
        case WidgetState.RECONNECTING:
        case WidgetState.CONNECTED:
        case WidgetState.ENDED:
          transitionTo(incoming.state);
          break;

        case WidgetState.ERROR: {
          const err = new Error(incoming.error ?? 'Connection error');
          setError(err);
          // Allow RECONNECTING → ERROR (circuit breaker path)
          if (stateRef.current === WidgetState.RECONNECTING) {
            stateRef.current = WidgetState.CONNECTED; // unblock FSM
          }
          transitionTo(WidgetState.ERROR);
          setIsRefreshing(false);
          setIsTimerPaused(false);
          onError?.(err);
          break;
        }

        default:
          break;
      }
    },
    [transitionTo, onError]
  );

  // ─── onReconnectNeeded ────────────────────────────────────────────────────
  //
  // Called from the service when RoomEvent.Disconnected classifies the
  // reason as non-terminal. Strategy dispatch:
  //
  //   MIC_DENIED    → surface error immediately, no retry
  //   TOKEN_EXPIRED → refresh token (default path)
  //   NETWORK_LOSS  → retry same token first
  //   SERVER_ERROR  → retry up to 2 times
  //
  const handleReconnectNeeded = useCallback(
    async (reason: ReconnectReason) => {
      if (!isMountedRef.current) return;

      // MIC_DENIED during a reconnect attempt — don't loop
      if (reason === 'MIC_DENIED') {
        const err = new Error('Microphone access was denied during reconnect.');
        setError(err);
        setErrorCode('MIC_DENIED');
        setIsRefreshing(false);
        setIsTimerPaused(false);
        if (stateRef.current !== WidgetState.ERROR) transitionTo(WidgetState.ERROR);
        onError?.(err);
        return;
      }

      console.log(`[Hook] Reconnect triggered — reason: ${reason}`);
      setIsRefreshing(true);

      // FSM: CONNECTED / MUTED → RECONNECTING (timer pauses via transitionTo)
      transitionTo(WidgetState.RECONNECTING);

      try {
        await liveKitService.refreshAndReconnect(reason);
        // On success, service emits CONNECTED → handleServiceStateChange resumes timer
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        const refreshError = err instanceof Error ? err : new Error('Failed to restore session');
        setError(refreshError);
        setErrorCode('REFRESH_FAILED');
        // Unblock FSM from RECONNECTING if needed
        if (stateRef.current === WidgetState.RECONNECTING) {
          stateRef.current = WidgetState.CONNECTED;
        }
        transitionTo(WidgetState.ERROR);
        onError?.(refreshError);
      } finally {
        if (isMountedRef.current) {
          setIsRefreshing(false);
          // Timer pause is cleared by transitionTo(CONNECTED or ERROR) above
        }
      }
    },
    [transitionTo, onError]
  );

  // ─── connect ──────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!isMountedRef.current) return;

    const current = stateRef.current;
    if (current === WidgetState.CONNECTING || current === WidgetState.CONNECTED) {
      console.warn('[FSM] Already connecting/connected — ignoring.');
      return;
    }

    // ── Session Lock Check ──────────────────────────────────────────────────
    if (!checkSessionLock()) {
      const lockError = new Error('A voice session is already active in another tab.');
      setError(lockError);
      transitionTo(WidgetState.ERROR);
      onError?.(lockError);
      return;
    }
    acquireSessionLock();

    setError(null);
    setErrorCode(null);
    setIsRefreshing(false);
    setIsTimerPaused(false);

    if (!transitionTo(WidgetState.CONNECTING)) return;

    setConnectionState({
      state: WidgetState.CONNECTING,
      participantCount: 0,
      audioEnabled: false,
      networkQuality: 'unknown',
    });

    try {
      const sessionData = await liveKitService.startSession(tenantId, {
        browser: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
        widget: true,
        agentId: config.agentId || undefined,
        widgetKey: config.agentId || undefined,
        hostOrigin: config.hostOrigin || undefined,
      });

      if (!isMountedRef.current) return;

      await liveKitService.connect(
        sessionData.token,
        sessionData.livekitUrl,
        handleServiceStateChange,
        handleTranscriptEntry,
        handleAudioLevel,
        handleReconnectNeeded,
      );

      if (!isMountedRef.current) {
        await liveKitService.disconnect();
        return;
      }

      transitionTo(WidgetState.CONNECTED);
      setConnectionState({
        state: WidgetState.CONNECTED,
        participantCount: 1,
        audioEnabled: true,
        networkQuality: 'good',
      });

    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const connectionError = err instanceof Error ? err : new Error('Failed to connect');
      const code = (err as Record<string, unknown>)?.code as string | undefined;
      setError(connectionError);
      setErrorCode(code ?? null);
      transitionTo(WidgetState.ERROR);
      onError?.(connectionError);
    }
  }, [
    tenantId,
    config.agentId,
    transitionTo,
    handleServiceStateChange,
    handleTranscriptEntry,
    handleAudioLevel,
    handleReconnectNeeded,
    onError,
  ]);

  // ─── disconnect (user-initiated, full teardown) ───────────────────────────

  const disconnect = useCallback(async () => {
    if (!isMountedRef.current) return;

    setIsRefreshing(false);
    setIsTimerPaused(false);
    releaseSessionLock();
    processedMessageIds.current.clear();

    try {
      await liveKitService.disconnect();
    } catch (err) {
      console.error('[LiveKit] Disconnect error:', err);
    }

    setAudioLevel(0);
    setAgentAudioLevel(0);
    setTranscript([]); // clear transcript only on explicit user end
    transitionTo(WidgetState.ENDED);

    setTimeout(() => {
      if (isMountedRef.current) transitionTo(WidgetState.IDLE);
    }, 600);
  }, [transitionTo]);

  // ─── toggleMute ───────────────────────────────────────────────────────────

  const toggleMute = useCallback(async () => {
    if (stateRef.current === WidgetState.CONNECTED) {
      await liveKitService.disableMicrophone();
      transitionTo(WidgetState.MUTED);
    } else if (stateRef.current === WidgetState.MUTED) {
      await liveKitService.enableMicrophone();
      transitionTo(WidgetState.CONNECTED);
    }
  }, [transitionTo]);

  // ─── updateConfig ─────────────────────────────────────────────────────────

  const updateConfig = useCallback((updates: Partial<WidgetConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  }, []);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => { liveKitService.disconnect().catch(console.error); };
  }, []);

  return {
    state,
    connectionState,
    transcript,
    config,
    error,
    errorCode,
    isRefreshing,
    isTimerPaused,
    connect,
    disconnect,
    toggleMute,
    updateConfig,
    audioLevel,
    agentAudioLevel,
  };
}

export type { UseVoiceWidgetOptions, UseVoiceWidgetReturn };
