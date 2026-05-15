/**
 * livekit.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-grade LiveKit voice session manager.
 *
 * RECONNECT ARCHITECTURE
 * ──────────────────────
 * • LiveKit SDK handles transient drops (< 15s) via built-in reconnect.
 * • Application-level reconnect handles: token expiry, network loss,
 *   server recycling. Uses exponential back-off up to 6 attempts.
 * • Failure type classification drives different strategies:
 *     TOKEN_EXPIRED  → fetch new token, rejoin room
 *     NETWORK_LOSS   → retry same token (if not expired)
 *     MIC_DENIED     → do NOT retry, surface error to user
 *     SERVER_ERROR   → retry max 2 times, then error
 * • Circuit breaker: > 5 failures within 30s → immediate ERROR, no more retries.
 *
 * RESOURCE SAFETY
 * ───────────────
 * • Every Room instance gets a unique `instanceId`. Event handlers check
 *   this ID before processing so stale events from destroyed rooms are dropped.
 * • `removeAllListeners()` is called before any `disconnect()`.
 * • Audio analysis is always stopped before the room is nulled.
 * • No duplicate listeners: each wireRoomEvents() call operates on a
 *   fresh Room instance (old instance destroyed first).
 *
 * SECURITY
 * ────────
 * • Tokens ALWAYS fetched from backend. Never hardcoded.
 * • `skipAutoLogout: true` on all service-level calls — a 401 during
 *   token refresh means "LiveKit token expired", not "user logged out".
 */

import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrack,
  ConnectionState as LKConnectionState,
  DisconnectReason,
} from 'livekit-client';
import { fetchApi, ApiError } from '@/lib/api-client';
import { WidgetState, ConnectionState, TranscriptEntry } from '@/types/widget';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SessionStartRequest {
  browser?: string;
  widget?: boolean;
  agentId?: string;
  widgetKey?: string;
  hostOrigin?: string;
  sessionId?: string;
}

export interface SessionTokenResponse {
  token: string;
  sessionId: string;
  livekitUrl: string;
}

export type StateCallback         = (state: ConnectionState) => void;
export type TranscriptCallback    = (entry: TranscriptEntry) => void;
export type AudioLevelCallback    = (userLevel: number, agentLevel: number) => void;
export type ReconnectNeededCallback = (reason: ReconnectReason) => void;

// ─── Failure classification ───────────────────────────────────────────────────

/**
 * Typed reconnect reasons — the hook uses these to choose the right strategy.
 *
 * TOKEN_EXPIRED : JWT expired or revoked → must fetch a new token
 * NETWORK_LOSS  : transient network drop (SDK could not auto-recover)
 * SERVER_ERROR  : 5xx from backend during reconnect token fetch
 * MIC_DENIED    : browser refused mic — do NOT retry, surface to user
 */
export type ReconnectReason =
  | 'TOKEN_EXPIRED'
  | 'NETWORK_LOSS'
  | 'SERVER_ERROR'
  | 'MIC_DENIED';

/** Maps DisconnectReason codes to our typed reconnect reasons. */
function classifyDisconnect(reason?: DisconnectReason): ReconnectReason | 'TERMINAL' {
  if (!reason) return 'NETWORK_LOSS';

  switch (reason) {
    // Token / auth issues → must refresh
    case DisconnectReason.SIGNAL_CLOSE:
    case DisconnectReason.ROOM_CLOSED:
      return 'TOKEN_EXPIRED';

    // User or admin actions → do not retry
    case DisconnectReason.CLIENT_INITIATED:
    case DisconnectReason.PARTICIPANT_REMOVED:
    case DisconnectReason.DUPLICATE_IDENTITY:
      return 'TERMINAL';

    // Network issues → retry same token
    case DisconnectReason.SERVER_SHUTDOWN:
    case DisconnectReason.STATE_MISMATCH:
    case DisconnectReason.MIGRATION:
    case DisconnectReason.JOIN_FAILURE:
    case DisconnectReason.CONNECTION_TIMEOUT:
      return 'NETWORK_LOSS';

    // SIP / agent errors → limited retries
    case DisconnectReason.AGENT_ERROR:
    case DisconnectReason.SIP_TRUNK_FAILURE:
      return 'SERVER_ERROR';

    default:
      return 'NETWORK_LOSS';
  }
}

// ─── Internal agent data message ─────────────────────────────────────────────

interface AgentTranscriptMessage {
  type: 'transcript';
  role: 'user' | 'agent';
  text: string;
  final?: boolean;
}

// ─── Circuit breaker ──────────────────────────────────────────────────────────

/**
 * Sliding-window circuit breaker.
 * Opens (trips) when > TRIP_THRESHOLD failures occur within WINDOW_MS.
 * Resets on explicit liveKitService.disconnect() or successful reconnect.
 */
const CIRCUIT_WINDOW_MS = 30_000; // 30 seconds
const CIRCUIT_TRIP_THRESHOLD = 5;

class CircuitBreaker {
  private failureTimestamps: number[] = [];
  private tripped = false;

  record(): void {
    const now = Date.now();
    this.failureTimestamps = this.failureTimestamps.filter(
      (t) => now - t < CIRCUIT_WINDOW_MS
    );
    this.failureTimestamps.push(now);

    if (this.failureTimestamps.length >= CIRCUIT_TRIP_THRESHOLD) {
      this.tripped = true;
    }
  }

  isTripped(): boolean {
    return this.tripped;
  }

  reset(): void {
    this.tripped = false;
    this.failureTimestamps = [];
  }
}

const circuitBreaker = new CircuitBreaker();

// ─── Module-level singletons ──────────────────────────────────────────────────

let room: Room | null = null;

/**
 * `roomInstanceId` is incremented every time a new Room is created.
 * Event callbacks capture the ID at the time of wiring; if the ID no
 * longer matches when the event fires, the callback is a no-op.
 * This is the primary defence against duplicate/stale event processing.
 */
let roomInstanceId = 0;

/** Persisted callbacks so refreshAndReconnect can re-wire a fresh room. */
let savedCallbacks: {
  onState:             StateCallback;
  onTranscript:        TranscriptCallback;
  onAudioLevel:        AudioLevelCallback;
  onReconnectNeeded:   ReconnectNeededCallback;
} | null = null;

/** Persisted token-fetch params so refresh doesn't need extra args. */
let savedTenantId = '';
let savedRequest: SessionStartRequest = {};
let savedLivekitUrl = '';     // kept for NETWORK_LOSS retries (same token)
let savedToken = '';          // kept for NETWORK_LOSS retries
let savedSessionId = '';      // kept for stateful reconnects

/** Reconnect state */
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 6;
const MAX_SERVER_ERROR_RETRIES = 2;
let serverErrorAttempts = 0;
let reconnectInProgress = false;

// ─── Audio analysis ───────────────────────────────────────────────────────────

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let micSourceNode: MediaStreamAudioSourceNode | null = null;
let audioAnimFrame: number | null = null;

function startAudioAnalysis(stream: MediaStream, onLevel: AudioLevelCallback): void {
  stopAudioAnalysis(); // always clean up before starting
  try {
    audioContext = new AudioContext();
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;
    micSourceNode = audioContext.createMediaStreamSource(stream);
    micSourceNode.connect(analyserNode);

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    const tick = () => {
      if (!analyserNode) return;
      analyserNode.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      
      // Get agent level from room
      let agentLevel = 0;
      if (room) {
        // Find the most active remote participant
        const remoteParticipants = Array.from(room.remoteParticipants.values());
        if (remoteParticipants.length > 0) {
          agentLevel = Math.max(...remoteParticipants.map(p => p.audioLevel));
        }
      }

      onLevel(avg / 255, agentLevel);
      audioAnimFrame = requestAnimationFrame(tick);
    };
    audioAnimFrame = requestAnimationFrame(tick);
  } catch {
    console.warn('[LiveKit] AudioContext unavailable');
  }
}

function stopAudioAnalysis(): void {
  if (audioAnimFrame !== null) {
    cancelAnimationFrame(audioAnimFrame);
    audioAnimFrame = null;
  }
  micSourceNode?.disconnect();
  analyserNode?.disconnect();
  audioContext?.close().catch(() => {});
  micSourceNode = null;
  analyserNode  = null;
  audioContext  = null;
}

// ─── Token fetching ───────────────────────────────────────────────────────────

async function fetchToken(
  tenantId: string,
  request: SessionStartRequest
): Promise<SessionTokenResponse> {
  try {
    const response = await fetchApi<{
      token: string;
      session_id: string;
      livekit_url: string;
      livekit_token?: string;
    }>('/v1/voice/sessions/start', {
      method: 'POST',
      skipAutoLogout: true,
      data: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(request.widgetKey ? { widget_key: request.widgetKey } : {}),
        ...(request.hostOrigin ? { host_origin: request.hostOrigin } : {}),
        session_id: request.sessionId,
        visitor_metadata: {
          browser: request.browser ?? (typeof window !== 'undefined' ? navigator.userAgent : 'unknown'),
          source: 'web_widget',
          agent_id: request.agentId,
        },
      },
    });

    const token = response.livekit_token ?? response.token;
    if (!token) throw new Error('Backend returned no token');
    return { token, sessionId: response.session_id, livekitUrl: response.livekit_url };

  } catch (prodErr: unknown) {
    if (prodErr instanceof ApiError && prodErr.status === 401) throw prodErr;
    if (prodErr instanceof ApiError && prodErr.status >= 400 && prodErr.status < 500) throw prodErr;
    if (prodErr instanceof ApiError && prodErr.status >= 500) {
      throw Object.assign(prodErr, { code: 'SERVER_ERROR' });
    }

    console.warn('[LiveKit] Production token fetch failed, trying dev fallback', prodErr);

    const testResp = await fetchApi<{
      token: string;
      room_name: string;
      livekit_url: string;
    }>('/v1/test/token', { skipAutoLogout: true });

    if (!testResp.token) throw new Error('Test token endpoint returned no token');
    return { token: testResp.token, sessionId: testResp.room_name, livekitUrl: testResp.livekit_url };
  }
}

// ─── DataChannel parsing ──────────────────────────────────────────────────────

function parseAgentMessage(data: Uint8Array): AgentTranscriptMessage | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(data));
    if (parsed?.type === 'transcript' && parsed?.text) return parsed as AgentTranscriptMessage;
    return null;
  } catch { return null; }
}

// ─── Room destruction helper ──────────────────────────────────────────────────

/**
 * Fully destroys a room instance:
 * 1. removeAllListeners()   ← must be first; prevents late events
 * 2. disconnect(true)       ← signals server + closes WebSocket
 * 3. null                   ← allow GC
 *
 * Does NOT touch stopAudioAnalysis — caller is responsible.
 */
async function destroyRoom(r: Room): Promise<void> {
  try {
    r.removeAllListeners(); // ← order matters: before disconnect
    await r.disconnect(true).catch(() => {});
  } catch {
    // best-effort
  }
}

// ─── Room event wiring ────────────────────────────────────────────────────────

/**
 * Wire all room events for a specific room instance.
 *
 * The `capturedId` guard is the key safety mechanism:
 * every callback checks that the room which fired the event is still the
 * current room (by ID). If not, the event is from a destroyed instance
 * and is silently dropped.
 */
function wireRoomEvents(
  r: Room,
  capturedId: number,
  onState:           StateCallback,
  onTranscript:      TranscriptCallback,
  onAudioLevel:      AudioLevelCallback,
  onReconnectNeeded: ReconnectNeededCallback
): void {
  const guard = () => roomInstanceId === capturedId;

  // SDK-level reconnect in progress
  r.on(RoomEvent.ConnectionStateChanged, (lkState: LKConnectionState) => {
    if (!guard()) return;
    if (lkState === LKConnectionState.Reconnecting) {
      onState({ state: WidgetState.RECONNECTING, participantCount: r.remoteParticipants.size, audioEnabled: false, networkQuality: 'poor' });
    }
  });

  // SDK successfully reconnected on its own (no token refresh needed)
  r.on(RoomEvent.Reconnected, () => {
    if (!guard()) return;
    reconnectAttempts = 0;
    serverErrorAttempts = 0;
    circuitBreaker.reset();
    onState({ 
      state: WidgetState.CONNECTED, 
      participantCount: r.remoteParticipants.size, 
      audioEnabled: r.localParticipant.isMicrophoneEnabled, 
      networkQuality: 'good',
      isAgentSpeaking: Array.from(r.remoteParticipants.values()).some(p => p.isSpeaking)
    });
  });

  r.on(RoomEvent.ParticipantConnected, (_p: RemoteParticipant) => {
    if (!guard()) return;
    onState({ 
      state: WidgetState.CONNECTED, 
      participantCount: r.remoteParticipants.size, 
      audioEnabled: r.localParticipant.isMicrophoneEnabled, 
      networkQuality: 'good',
      isAgentSpeaking: Array.from(r.remoteParticipants.values()).some(p => p.isSpeaking)
    });
  });

  r.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
    if (!guard()) return;
    const isAgentSpeaking = speakers.some(s => s instanceof RemoteParticipant);
    onState({ 
      state: WidgetState.CONNECTED, 
      participantCount: r.remoteParticipants.size, 
      audioEnabled: r.localParticipant.isMicrophoneEnabled, 
      networkQuality: 'good',
      isAgentSpeaking,
      agentAudioLevel: Math.max(0, ...speakers.filter(s => s instanceof RemoteParticipant).map(s => (s as RemoteParticipant).audioLevel))
    });
  });

  r.on(RoomEvent.ParticipantDisconnected, () => {
    if (!guard()) return;
    onState({ state: WidgetState.ENDED, participantCount: r.remoteParticipants.size, audioEnabled: false, networkQuality: 'unknown' });
  });

  r.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
    if (!guard()) return;
    if (track.kind === Track.Kind.Audio) track.attach();
  });

  r.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
    if (!guard()) return;
    if (track.kind === Track.Kind.Audio) track.detach();
  });

  r.on(RoomEvent.DataReceived, (data: Uint8Array) => {
    if (!guard()) return;
    const msg = parseAgentMessage(data);
    if (msg) {
      onTranscript({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: msg.role,
        text: msg.text,
        timestamp: new Date(),
      });
    }
  });

  r.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
    if (!guard()) return;
    if (participant === r.localParticipant) {
      const q = quality === 'excellent' ? 'excellent' : quality === 'good' ? 'good' : 'poor';
      onState({ state: WidgetState.CONNECTED, participantCount: r.remoteParticipants.size, audioEnabled: r.localParticipant.isMicrophoneEnabled, networkQuality: q });
    }
  });

  /**
   * RoomEvent.Disconnected — the primary entry point for reconnect logic.
   *
   * Classification:
   *   TERMINAL      → end call, no retry
   *   TOKEN_EXPIRED → refresh token + rejoin
   *   NETWORK_LOSS  → retry with same token (network may have recovered)
   *   SERVER_ERROR  → retry max 2 times, then error
   */
  r.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
    if (!guard()) return;
    console.log(`[LiveKit] Disconnected — reason: ${DisconnectReason[reason ?? 0] ?? reason ?? 'unknown'}`);

    const classification = classifyDisconnect(reason);

    if (classification === 'TERMINAL') {
      stopAudioAnalysis();
      onState({ state: WidgetState.ENDED, participantCount: 0, audioEnabled: false, networkQuality: 'unknown' });
      return;
    }

    // All non-terminal disconnects → circuit breaker check first
    circuitBreaker.record();
    if (circuitBreaker.isTripped()) {
      console.error('[LiveKit] Circuit breaker tripped — too many failures in 30s');
      stopAudioAnalysis();
      onState({
        state: WidgetState.ERROR,
        error: 'Connection unstable. Please try again.',
        participantCount: 0,
        audioEnabled: false,
        networkQuality: 'unknown',
      });
      return;
    }

    stopAudioAnalysis();
    onState({ state: WidgetState.RECONNECTING, participantCount: 0, audioEnabled: false, networkQuality: 'poor' });
    onReconnectNeeded(classification);
  });
}

// ─── Mic + analysis helper ────────────────────────────────────────────────────

async function enableMicAndAnalyse(r: Room, onAudioLevel: AudioLevelCallback): Promise<void> {
  await r.localParticipant.setMicrophoneEnabled(true);
  const micTrack = r.localParticipant.getTrackPublication(Track.Source.Microphone);
  const mediaStream = ((micTrack?.track as unknown) as { mediaStream?: MediaStream } | undefined)?.mediaStream;
  if (mediaStream) startAudioAnalysis(mediaStream, onAudioLevel);
}

// ─── Room factory ─────────────────────────────────────────────────────────────

function createRoom(): Room {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000,
    },
  });
}

// ─── Public service API ───────────────────────────────────────────────────────

export const liveKitService = {

  // ── startSession ─────────────────────────────────────────────────────────

  startSession: async (
    tenantId: string,
    request: SessionStartRequest = {}
  ): Promise<SessionTokenResponse> => {
    savedTenantId = tenantId;
    savedRequest  = request;
    const result = await fetchToken(tenantId, request);
    savedToken      = result.token;
    savedLivekitUrl = result.livekitUrl;
    savedSessionId  = result.sessionId;
    return result;
  },

  // ── connect ───────────────────────────────────────────────────────────────

  connect: async (
    token: string,
    livekitUrl: string,
    onState:           StateCallback,
    onTranscript:      TranscriptCallback     = () => {},
    onAudioLevel:      AudioLevelCallback     = () => {},
    onReconnectNeeded: ReconnectNeededCallback = () => {}
  ): Promise<Room> => {
    // Destroy any stale room (removeAllListeners first → no duplicate events)
    if (room) {
      await destroyRoom(room);
      room = null;
    }

    if (!livekitUrl) throw new Error('LiveKit URL is not configured.');

    // Persist for refresh
    savedToken      = token;
    savedLivekitUrl = livekitUrl;
    savedCallbacks  = { onState, onTranscript, onAudioLevel, onReconnectNeeded };
    reconnectAttempts     = 0;
    serverErrorAttempts   = 0;
    reconnectInProgress   = false;
    circuitBreaker.reset();

    // Create room with a new ID so stale event guards work correctly
    roomInstanceId++;
    const capturedId = roomInstanceId;

    room = createRoom();
    wireRoomEvents(room, capturedId, onState, onTranscript, onAudioLevel, onReconnectNeeded);
    await room.connect(livekitUrl, token);

    try {
      await enableMicAndAnalyse(room, onAudioLevel);
    } catch (micErr: unknown) {
      const msg = micErr instanceof Error ? micErr.message : 'Permission denied';
      await destroyRoom(room);
      room = null;
      throw Object.assign(new Error(`Microphone access denied: ${msg}`), { code: 'MIC_DENIED' });
    }

    return room;
  },

  // ── refreshAndReconnect ───────────────────────────────────────────────────

  /**
   * Seamless reconnect that preserves UI state (transcript, timer, panel).
   *
   * Called by the hook when onReconnectNeeded fires.
   * Strategy is chosen based on the ReconnectReason:
   *
   *   TOKEN_EXPIRED → fetch new token → rejoin
   *   NETWORK_LOSS  → retry with cached token first, then fetch new one
   *   SERVER_ERROR  → retry up to MAX_SERVER_ERROR_RETRIES times
   *   MIC_DENIED    → never called (hook surfaces error immediately)
   *
   * Back-off: delay = min(1000 × 2^attempt, 10_000ms)
   */
  refreshAndReconnect: async (reason: ReconnectReason): Promise<void> => {
    if (!savedCallbacks || !savedTenantId) {
      console.error('[LiveKit] refreshAndReconnect called before connect');
      return;
    }

    // Prevent concurrent reconnect loops
    if (reconnectInProgress) {
      console.warn('[LiveKit] Reconnect already in progress — skipping duplicate call');
      return;
    }

    reconnectInProgress = true;

    const { onState, onTranscript, onAudioLevel, onReconnectNeeded } = savedCallbacks;

    try {
      await _reconnectLoop(reason, onState, onTranscript, onAudioLevel, onReconnectNeeded);
    } finally {
      reconnectInProgress = false;
    }
  },

  // ── disconnect (full teardown) ────────────────────────────────────────────

  disconnect: async (): Promise<void> => {
    stopAudioAnalysis();
    if (room) {
      await destroyRoom(room);
      room = null;
    }
    reconnectAttempts   = 0;
    serverErrorAttempts = 0;
    reconnectInProgress = false;
    circuitBreaker.reset();
  },

  // ── mic control ───────────────────────────────────────────────────────────

  disableMicrophone: async (): Promise<void> => {
    await room?.localParticipant.setMicrophoneEnabled(false);
  },

  enableMicrophone: async (): Promise<void> => {
    await room?.localParticipant.setMicrophoneEnabled(true);
  },

  // ── introspection ─────────────────────────────────────────────────────────

  isConnected: (): boolean => room?.state === LKConnectionState.Connected,

  getParticipantCount: (): number => (room ? room.remoteParticipants.size + 1 : 0),
};

// ─── Internal reconnect loop (extracted for clarity) ──────────────────────────

async function _reconnectLoop(
  reason: ReconnectReason,
  onState:           StateCallback,
  onTranscript:      TranscriptCallback,
  onAudioLevel:      AudioLevelCallback,
  onReconnectNeeded: ReconnectNeededCallback
): Promise<void> {
  // ── SERVER_ERROR: max 2 attempts, then give up ─────────────────────────
  if (reason === 'SERVER_ERROR') {
    if (serverErrorAttempts >= MAX_SERVER_ERROR_RETRIES) {
      console.error('[LiveKit] Server error retry limit reached');
      onState({ state: WidgetState.ERROR, error: 'Server error. Please try again later.', participantCount: 0, audioEnabled: false, networkQuality: 'unknown' });
      return;
    }
    serverErrorAttempts++;
  }

  // ── Global attempt limit ───────────────────────────────────────────────
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`[LiveKit] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
    onState({ state: WidgetState.ERROR, error: 'Could not restore the call. Please end and retry.', participantCount: 0, audioEnabled: false, networkQuality: 'unknown' });
    return;
  }

  reconnectAttempts++;
  const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10_000);
  console.log(`[LiveKit] Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} (${reason}) in ${backoffMs}ms`);

  await new Promise<void>((r) => setTimeout(r, backoffMs));

  try {
    // ── Soft-disconnect: remove listeners, leave room, keep hook state ──
    if (room) {
      await destroyRoom(room);
      room = null;
    }

    // ── Token strategy ───────────────────────────────────────────────────
    let token     = savedToken;
    let livekitUrl = savedLivekitUrl;

    if (reason === 'TOKEN_EXPIRED' || reason === 'SERVER_ERROR') {
      // Must get a fresh token — pass savedSessionId to resume existing session
      const sessionData = await fetchToken(savedTenantId, { 
        ...savedRequest, 
        sessionId: savedSessionId 
      });
      token     = sessionData.token;
      livekitUrl = sessionData.livekitUrl;
      savedToken      = token;
      savedLivekitUrl = livekitUrl;
      savedSessionId  = sessionData.sessionId;
    }
    // NETWORK_LOSS: try cached token first — avoids unnecessary backend calls
    // If it fails, the next attempt will fetch a new one

    // ── Create fresh room + wire events ─────────────────────────────────
    roomInstanceId++;
    const capturedId = roomInstanceId;

    room = createRoom();
    wireRoomEvents(room, capturedId, onState, onTranscript, onAudioLevel, onReconnectNeeded);
    await room.connect(livekitUrl, token);

    // ── Re-enable mic (permission already granted) ───────────────────────
    await enableMicAndAnalyse(room, onAudioLevel);

    // ── Success ──────────────────────────────────────────────────────────
    reconnectAttempts   = 0;
    serverErrorAttempts = 0;
    circuitBreaker.reset();

    onState({
      state: WidgetState.CONNECTED,
      participantCount: room.remoteParticipants.size + 1,
      audioEnabled: true,
      networkQuality: 'good',
    });

    console.log(`[LiveKit] Reconnect successful after ${reconnectAttempts} attempts`);

  } catch (err: unknown) {
    console.error(`[LiveKit] Reconnect attempt ${reconnectAttempts} failed:`, err);

    // Dashboard session genuinely expired → can't recover, must log out
    if (err instanceof ApiError && err.status === 401) {
      onState({ state: WidgetState.ERROR, error: 'Your session has expired. Please log in again.', participantCount: 0, audioEnabled: false, networkQuality: 'unknown' });
      return;
    }

    // Mic denied during reconnect → don't retry
    const code = (err as Record<string, unknown>)?.code;
    if (code === 'MIC_DENIED') {
      onState({ state: WidgetState.ERROR, error: 'Microphone access denied. Cannot restore call.', participantCount: 0, audioEnabled: false, networkQuality: 'unknown' });
      return;
    }

    // Server error on token fetch → escalate reason
    if (code === 'SERVER_ERROR' || (err instanceof ApiError && err.status >= 500)) {
      await _reconnectLoop('SERVER_ERROR', onState, onTranscript, onAudioLevel, onReconnectNeeded);
      return;
    }

    // NETWORK_LOSS on cached token → fetch fresh token next time
    if (reason === 'NETWORK_LOSS') {
      await _reconnectLoop('TOKEN_EXPIRED', onState, onTranscript, onAudioLevel, onReconnectNeeded);
      return;
    }

    // Default: retry same reason with back-off
    await _reconnectLoop(reason, onState, onTranscript, onAudioLevel, onReconnectNeeded);
  }
}
