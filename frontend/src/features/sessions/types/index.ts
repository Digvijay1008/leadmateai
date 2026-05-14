export interface Session {
  id: string;
  tenant_id: string;
  room_name: string;
  participant_identity: string;
  agent_identity?: string;
  direction?: 'inbound' | 'outbound';
  phone_number?: string | null;
  lead_id?: string | null;
  duration_seconds: number;
  billed_seconds?: number;
  status: 'dialing' | 'ringing' | 'connected' | 'active' | 'completed' | 'failed' | 'timeout' | 'cancelled' | 'max_duration' | 'insufficient_funds' | 'missed';
  transcript?: TranscriptSegment[];
  transcript_summary?: string | null;
  total_cost?: number;
  cost_total?: number;
  end_reason?: string | null;
  created_at: string;
  ended_at?: string | null;
}

export interface TranscriptSegment {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export interface SessionsListResponse {
  sessions: Session[];
  total: number;
}

export interface SessionFilters {
  period?: '7days' | '30days' | '90days' | 'all';
  status?: Session['status'];
  direction?: 'inbound' | 'outbound' | 'all';
  limit?: number;
  offset?: number;
}
