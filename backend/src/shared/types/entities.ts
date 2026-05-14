// ===========================================
// DATABASE ENTITY TYPES
// ===========================================

export interface Tenant {
    id: string;
    user_id: string;
    business_name: string;
    slug: string | null;
    industry: string | null;
    timezone: string;
    status: 'trial' | 'active' | 'suspended' | 'cancelled';
    system_prompt?: string;
    greeting_message?: string;
    widget_key?: string | null;
    allowed_domains?: string[] | null;
    created_at: Date;
    updated_at: Date;
}

export interface VoicePreset {
    id: string;
    display_name: string;
    description: string | null;
    base_price_per_min: number;
    provider_cost_per_min: number | null;
    currency: string;
    provider_config: ProviderConfig;
    is_active: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
}

export interface ProviderConfig {
    stt: {
        provider: 'deepgram' | 'sarvam';
        model: string;
    };
    llm: {
        provider: 'groq' | 'openai' | 'gemini' | 'sarvam';
        model: string;
    };
    tts: {
        provider: 'deepgram' | 'elevenlabs' | 'sarvam';
        model: string;
    };
}

export interface VoicePersona {
    id: string;
    display_name: string;
    gender: 'male' | 'female' | 'neutral';
    accent: string | null;
    language: string;
    provider_voice_ids: Record<string, string>;
    is_active: boolean;
    created_at: Date;
}

export interface TenantVoiceConfig {
    tenant_id: string;
    preset_id: string;
    voice_persona_id: string;
    agent_name: string;
    system_prompt_template: string | null;
    greeting_message: string;
    goodbye_message: string;
    business_hours: BusinessHours | null;
    tools_enabled: string[];
    max_session_duration_seconds: number;
    inactivity_timeout_seconds: number;
    created_at: Date;
    updated_at: Date;
}

export interface BusinessHours {
    timezone: string;
    schedule: Record<string, { open: string; close: string } | null>;
}

export interface Wallet {
    tenant_id: string;
    balance: number;
    currency: string;
    low_balance_threshold: number;
    auto_recharge_enabled: boolean;
    auto_recharge_amount: number | null;
    auto_recharge_threshold: number | null;
    last_low_balance_alert_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export type WalletTransactionType =
    | 'topup'
    | 'usage_deduction'
    | 'hold_created'
    | 'hold_released'
    | 'hold_settled'
    | 'admin_adjustment'
    | 'refund'
    | 'promotional_credit';

export interface WalletTransaction {
    id: string;
    wallet_id: string;
    type: WalletTransactionType;
    amount: number;
    balance_after: number;
    reference_type: string | null;
    reference_id: string | null;
    description: string | null;
    metadata: Record<string, any> | null;
    created_at: Date;
}

export type WalletHoldStatus = 'active' | 'settled' | 'released' | 'expired';

export interface WalletHold {
    id: string;
    wallet_id: string;
    session_id: string;
    amount: number;
    status: WalletHoldStatus;
    expires_at: Date;
    settled_amount: number | null;
    settled_at: Date | null;
    created_at: Date;
}

export type VoiceSessionStatus =
    | 'pending'
    | 'active'
    | 'completed'
    | 'failed'
    | 'timeout'
    | 'max_duration'
    | 'insufficient_funds'
    | 'cancelled';

/**
 * Terminal statuses - sessions in these states cannot transition further
 * Used for idempotency checks and state machine validation
 */
export const TERMINAL_SESSION_STATUSES: readonly VoiceSessionStatus[] = [
    'completed',
    'failed',
    'timeout',
    'max_duration',
    'insufficient_funds',
    'cancelled',
] as const;

/**
 * Check if a session status is terminal (cannot change)
 */
export function isTerminalStatus(status: VoiceSessionStatus): boolean {
    return TERMINAL_SESSION_STATUSES.includes(status);
}

export interface VoiceSession {
    id: string;
    tenant_id: string;
    livekit_room_name: string;
    preset_snapshot: PresetSnapshot;
    voice_config_snapshot: VoiceConfigSnapshot;
    status: VoiceSessionStatus;
    phone_number?: string | null;
    direction?: 'inbound' | 'outbound' | null;
    lead_id?: string | null;
    created_at: Date;
    started_at: Date | null;
    session_started_at?: Date | null;
    first_audio_at?: Date | null;
    ended_at: Date | null;
    session_ended_at?: Date | null;
    max_duration_seconds: number | null;
    duration_seconds: number | null;
    billed_seconds: number | null;
    billable_duration_seconds?: number | null;
    cost_total: number | null;
    hold_id: string | null;
    settlement_status?: string | null;
    settlement_attempts?: number | null;
    last_settlement_attempt_at?: Date | null;
    last_settlement_error?: string | null;
    duration_source?: string | null;
    duration_anomaly?: boolean | null;
    transcript_summary: string | null;
    tool_calls_count: number;
    user_turns_count: number;
    agent_turns_count: number;
    visitor_metadata: Record<string, any> | null;
    end_reason: string | null;
    updated_at: Date;
}

export interface PresetSnapshot {
    preset_id: string;
    price_per_min: number;
    currency: string;
    provider_config: ProviderConfig;
}

export interface VoiceConfigSnapshot {
    voice_persona_id: string;
    agent_name: string;
    system_prompt: string;
    greeting_message: string;
    goodbye_message: string;
    tools_enabled: string[];
    max_session_duration_seconds: number;
    inactivity_timeout_seconds: number;
}

export interface KBDocument {
    id: string;
    tenant_id: string;
    filename: string;
    original_filename: string | null;
    file_type: string | null;
    file_size_bytes: number | null;
    content_hash: string | null;
    status: 'processing' | 'ready' | 'error' | 'deleted';
    error_message: string | null;
    chunk_count: number;
    created_at: Date;
    updated_at: Date;
}

export interface KBEmbedding {
    id: string;
    tenant_id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    token_count: number | null;
    // embedding is vector type - not typically returned
    metadata: Record<string, any> | null;
    created_at: Date;
}

export interface SessionTranscript {
    id: string;
    session_id: string;
    tenant_id: string;
    turn_index: number;
    speaker: 'user' | 'agent';
    content: string;
    timestamp_ms: number | null;
    confidence: number | null;
    created_at: Date;
}

export interface SessionToolCall {
    id: string;
    session_id: string;
    tenant_id: string;
    tool_name: string;
    input_params: Record<string, any> | null;
    output_result: Record<string, any> | null;
    success: boolean | null;
    error_message: string | null;
    duration_ms: number | null;
    created_at: Date;
}
