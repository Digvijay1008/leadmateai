// ===========================================
// API REQUEST/RESPONSE TYPES
// ===========================================

import { VoiceSessionStatus } from './entities.js';

export interface StartSessionRequest {
    tenant_id: string;
    session_id?: string;
    phone_number?: string;
    direction?: 'inbound' | 'outbound';
    lead_id?: string;
    visitor_metadata?: {
        browser?: string;
        os?: string;
        ip?: string;
        referrer?: string;
        [key: string]: any;
    };
}

export interface StartSessionResponse {
    session_id: string;
    livekit_room_name: string;
    livekit_token: string;
    livekit_url: string;
    max_duration_seconds: number;
    greeting_message: string;
    agent_name: string;
}

export interface EndSessionRequest {
    session_id: string;
    duration_seconds: number;
    end_reason: 'user_hangup' | 'agent_hangup' | 'timeout' | 'max_duration' | 'error' | 'insufficient_funds';
    // Backward compatibility for older agent payloads
    termination_reason?: string;
    agent_reported_at?: string;
    transcript_summary?: string;
    transcript?: Array<{ role: string; content: string }>;
    tool_calls_count?: number;
    user_turns_count?: number;
    agent_turns_count?: number;
}

export interface EndSessionResponse {
    session_id: string;
    status: VoiceSessionStatus;
    duration_seconds: number;
    billed_seconds: number;
    cost_total: number;
    currency: string;
    wallet_balance_after: number;
}

export interface SessionDetails {
    id: string;
    tenant_id: string;
    status: VoiceSessionStatus;
    created_at: string;
    started_at: string | null;
    ended_at: string | null;
    duration_seconds: number | null;
    cost_total: number | null;
    currency: string;
    preset_name: string;
    transcript_summary: string | null;
}

// ===========================================
// WALLET APIs
// ===========================================

export interface WalletBalanceResponse {
    tenant_id: string;
    balance: number;
    currency: string;
    available_minutes: number;  // Based on current preset
    low_balance_threshold: number;
    is_low_balance: boolean;
}

export interface WalletTransactionItem {
    id: string;
    type: string;
    amount: number;
    balance_after: number;
    description: string | null;
    created_at: string;
    reference_type: string | null;
    reference_id: string | null;
}

export interface WalletTransactionsResponse {
    transactions: WalletTransactionItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        has_more: boolean;
    };
}

// ===========================================
// PRESET APIs
// ===========================================

export interface PresetListItem {
    id: string;
    display_name: string;
    description: string | null;
    price_per_min: number;
    currency: string;
    features: string[];  // Derived from description
}

export interface PresetListResponse {
    presets: PresetListItem[];
    current_preset_id: string | null;
}

// ===========================================
// RAG APIs
// ===========================================

export interface RAGQueryRequest {
    tenant_id: string;
    query: string;
    top_k?: number;  // Default 3
    min_similarity?: number;  // Default 0.7
}

export interface RAGChunk {
    content: string;
    similarity: number;
    document_id: string;
    chunk_index: number;
    metadata: Record<string, any> | null;
}

export interface RAGQueryResponse {
    chunks: RAGChunk[];
    query_embedding_tokens: number;
}

// ===========================================
// AGENT MANIFEST (Passed to Python Agent)
// ===========================================

export interface AgentSessionManifest {
    session_id: string;
    tenant_id: string;

    // Timing constraints
    max_duration_seconds: number;
    inactivity_timeout_seconds: number;

    // Voice configuration
    voice: {
        persona_id: string;
        provider: string;
        voice_id: string;
        speaking_rate?: number;
    };

    // STT configuration
    stt: {
        provider: string;
        model: string;
        language: string;
    };

    // LLM configuration
    llm: {
        provider: string;
        model: string;
        system_prompt: string;
        temperature?: number;
    };

    // TTS configuration
    tts: {
        provider: string;
        model: string;
        voice_id: string;
    };

    // Agent behavior
    greeting_message: string;
    goodbye_message: string;
    tools_enabled: string[];

    // Backend API access
    backend_api_url: string;
    backend_auth_token: string;

    // Optional RAG context scope
    knowledge_base_id?: string | null;
}

// ===========================================
// ERROR RESPONSES
// ===========================================

export interface APIError {
    error: {
        code: string;
        message: string;
        details?: Record<string, any>;
    };
}

export type APIErrorCode =
    | 'INVALID_REQUEST'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'INSUFFICIENT_FUNDS'
    | 'SESSION_NOT_FOUND'
    | 'SESSION_ALREADY_ENDED'
    | 'TENANT_SUSPENDED'
    | 'PRESET_NOT_FOUND'
    | 'CONFLICT'
    | 'INTERNAL_ERROR';
