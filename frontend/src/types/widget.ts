export enum WidgetState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  RECONNECTING = 'reconnecting',
  CONNECTED = 'connected',
  MUTED = 'muted',
  ENDED = 'ended',
  ERROR = 'error',
}

export interface WidgetConfig {
  id: string;
  tenantId: string;
  agentId: string;
  hostOrigin?: string;
  agentName: string;
  theme: WidgetTheme;
  position: WidgetPosition;
  welcomeMessage: string;
  isEnabled: boolean;
  allowedDomains: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WidgetTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  accentStyle: 'gradient' | 'solid' | 'glass';
  position?: WidgetPosition;
}

export interface WidgetPosition {
  corner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  offsetX: number;
  offsetY: number;
  size: 'small' | 'medium' | 'large';
}

export interface WidgetTokenResponse {
  token: string;
  sessionId: string;
  livekitUrl: string;
}

export interface VoiceSession {
  sessionId: string;
  roomName: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  transcript: TranscriptEntry[];
  status: 'active' | 'ended' | 'failed';
}

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export interface ConnectionState {
  state: WidgetState;
  error?: string;
  participantCount: number;
  audioEnabled: boolean;
  networkQuality: 'excellent' | 'good' | 'poor' | 'unknown';
}

export interface LiveKitRoomEvents {
  connected: () => void;
  disconnected: () => void;
  participantConnected: (participant: unknown) => void;
  participantDisconnected: (participant: unknown) => void;
  audioTrackSubscribed: (track: unknown) => void;
  audioTrackUnsubscribed: (track: unknown) => void;
  error: (error: Error) => void;
}

export interface AudioAnalyzerData {
  frequencyData: Uint8Array;
  volume: number;
  isSpeaking: boolean;
}

export type WidgetStateTransition = 
  | { from: WidgetState.IDLE; to: WidgetState.CONNECTING }
  | { from: WidgetState.CONNECTING; to: WidgetState.CONNECTED | WidgetState.ERROR }
  | { from: WidgetState.RECONNECTING; to: WidgetState.CONNECTED | WidgetState.ERROR | WidgetState.ENDED }
  | { from: WidgetState.CONNECTED; to: WidgetState.MUTED | WidgetState.ENDED | WidgetState.ERROR | WidgetState.RECONNECTING }
  | { from: WidgetState.MUTED; to: WidgetState.CONNECTED | WidgetState.ENDED | WidgetState.RECONNECTING }
  | { from: WidgetState.ENDED; to: WidgetState.IDLE }
  | { from: WidgetState.ERROR; to: WidgetState.IDLE | WidgetState.CONNECTING | WidgetState.RECONNECTING };

export function isValidTransition(from: WidgetState, to: WidgetState): boolean {
  const validTransitions: Record<WidgetState, WidgetState[]> = {
    [WidgetState.IDLE]: [WidgetState.CONNECTING],
    [WidgetState.CONNECTING]: [WidgetState.CONNECTED, WidgetState.ERROR],
    [WidgetState.RECONNECTING]: [WidgetState.CONNECTED, WidgetState.ERROR, WidgetState.ENDED],
    [WidgetState.CONNECTED]: [WidgetState.MUTED, WidgetState.ENDED, WidgetState.ERROR, WidgetState.RECONNECTING],
    [WidgetState.MUTED]: [WidgetState.CONNECTED, WidgetState.ENDED, WidgetState.RECONNECTING],
    [WidgetState.ENDED]: [WidgetState.IDLE],
    [WidgetState.ERROR]: [WidgetState.IDLE, WidgetState.CONNECTING, WidgetState.RECONNECTING],
  };
  return validTransitions[from].includes(to);
}

export const DEFAULT_WIDGET_CONFIG: Omit<WidgetConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
  agentId: '',
  agentName: '',
  theme: {
    primaryColor: '#6366f1',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    borderRadius: 24,
    accentStyle: 'gradient',
  },
  position: {
    corner: 'bottom-right',
    offsetX: 24,
    offsetY: 24,
    size: 'medium',
  },
  welcomeMessage: 'Hello! How can I help you today?',
  isEnabled: true,
  allowedDomains: [],
};
