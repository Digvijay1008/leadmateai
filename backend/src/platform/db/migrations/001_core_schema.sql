-- ===========================================
-- LEADMATE VOICE AI - DATABASE SCHEMA
-- Migration: 001_core_schema
-- Version: 1.1 (with safety hardening)
-- ===========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ===========================================
-- SESSION STATUS ENUM (Explicit State Machine)
-- ===========================================
-- State transitions:
-- PENDING → ACTIVE → COMPLETED/FAILED/TIMEOUT/MAX_DURATION/INSUFFICIENT_FUNDS
-- PENDING → CANCELLED
-- Once in terminal state, no further transitions allowed.

CREATE TYPE session_status AS ENUM (
    'pending',           -- Created, waiting for user to join
    'active',            -- User connected, conversation in progress
    'completed',         -- Normal end (terminal)
    'failed',            -- Error occurred (terminal)
    'timeout',           -- Inactivity timeout (terminal)
    'max_duration',      -- Hit time limit (terminal)
    'insufficient_funds', -- Wallet depleted (terminal)
    'cancelled'          -- User cancelled before start (terminal)
);

CREATE TYPE wallet_hold_status AS ENUM (
    'active',    -- Hold is in effect
    'settled',   -- Hold was converted to actual charge
    'released',  -- Hold was released (cancelled session)
    'expired'    -- Hold expired without settlement
);

CREATE TYPE wallet_transaction_type AS ENUM (
    'topup',
    'usage_deduction',
    'hold_created',
    'hold_released',
    'hold_settled',
    'admin_adjustment',
    'refund',
    'promotional_credit'
);

-- ===========================================
-- 1. TENANTS (Business Customers)
-- ===========================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,  -- FK to auth.users (Supabase Auth)
    business_name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    industry VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_user_id ON tenants(user_id);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ===========================================
-- 2. VOICE PRESETS (Product Catalog)
-- ===========================================
CREATE TABLE voice_presets (
    id VARCHAR(50) PRIMARY KEY,  -- 'standard', 'premium', 'ultra'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price_per_min NUMERIC(12, 4) NOT NULL,  -- Price charged to tenant (NUMERIC for precision)
    provider_cost_per_min NUMERIC(12, 4),        -- Our actual cost (internal)
    currency VARCHAR(3) DEFAULT 'INR',
    provider_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 3. VOICE PERSONAS (Available Voices)
-- ===========================================
CREATE TABLE voice_personas (
    id VARCHAR(50) PRIMARY KEY,  -- 'maya', 'raj', 'sarah'
    display_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'neutral')),
    accent VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en-IN',
    provider_voice_ids JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 4. TENANT VOICE CONFIG
-- ===========================================
CREATE TABLE tenant_voice_config (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    preset_id VARCHAR(50) REFERENCES voice_presets(id) DEFAULT 'standard',
    voice_persona_id VARCHAR(50) REFERENCES voice_personas(id) DEFAULT 'maya',
    agent_name VARCHAR(100) DEFAULT 'AI Assistant',
    system_prompt_template TEXT,
    greeting_message TEXT DEFAULT 'Hello! How can I help you today?',
    goodbye_message TEXT DEFAULT 'Thank you for calling. Goodbye!',
    business_hours JSONB,
    tools_enabled JSONB DEFAULT '["get_business_hours"]',
    max_session_duration_seconds INTEGER DEFAULT 900,  -- 15 minutes
    inactivity_timeout_seconds INTEGER DEFAULT 120,    -- 2 minutes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 5. WALLETS (Prepaid Balances)
-- All money columns use NUMERIC(12, 4) for precision
-- ===========================================
CREATE TABLE wallets (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    balance NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'INR',
    low_balance_threshold NUMERIC(12, 4) DEFAULT 50,
    auto_recharge_enabled BOOLEAN DEFAULT false,
    auto_recharge_amount NUMERIC(12, 4),
    auto_recharge_threshold NUMERIC(12, 4),
    last_low_balance_alert_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 6. WALLET TRANSACTIONS (Immutable Ledger)
-- ===========================================
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(tenant_id) ON DELETE RESTRICT,
    type wallet_transaction_type NOT NULL,
    amount NUMERIC(12, 4) NOT NULL,  -- Positive for credits, negative for debits
    balance_after NUMERIC(12, 4) NOT NULL,
    reference_type VARCHAR(50),      -- 'session', 'payment', 'hold', 'admin'
    reference_id UUID,               -- session_id, payment_id, hold_id
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_tx_created_at ON wallet_transactions(created_at);
CREATE INDEX idx_wallet_tx_reference ON wallet_transactions(reference_type, reference_id);
-- Performance index for transaction history queries
CREATE INDEX idx_wallet_tx_wallet_created ON wallet_transactions(wallet_id, created_at DESC);

-- ===========================================
-- 7. WALLET HOLDS (Concurrency Safety)
-- ===========================================
CREATE TABLE wallet_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(tenant_id) ON DELETE RESTRICT,
    session_id UUID NOT NULL,  -- FK added after voice_sessions table
    amount NUMERIC(12, 4) NOT NULL CHECK (amount > 0),
    status wallet_hold_status DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL,
    settled_amount NUMERIC(12, 4),
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_holds_wallet ON wallet_holds(wallet_id);
CREATE INDEX idx_wallet_holds_session ON wallet_holds(session_id);
CREATE INDEX idx_wallet_holds_status ON wallet_holds(status);
CREATE INDEX idx_wallet_holds_expires ON wallet_holds(expires_at) WHERE status = 'active';
-- Compound index for balance calculation queries
CREATE INDEX idx_wallet_holds_wallet_status ON wallet_holds(wallet_id, status) WHERE status = 'active';

-- ===========================================
-- 8. VOICE SESSIONS (Core Billing Unit)
-- ===========================================
CREATE TABLE voice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    livekit_room_name VARCHAR(255) NOT NULL UNIQUE,
    
    -- Snapshot of config at session start (immutable for billing)
    preset_snapshot JSONB NOT NULL,
    voice_config_snapshot JSONB NOT NULL,
    
    -- Session State (using enum for type safety)
    status session_status DEFAULT 'pending',
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,          -- When user actually joined
    ended_at TIMESTAMPTZ,
    max_duration_seconds INTEGER,    -- Calculated at start based on wallet
    
    -- Billing (NUMERIC for money precision)
    duration_seconds INTEGER,
    billed_seconds INTEGER,          -- May differ due to rounding rules
    cost_total NUMERIC(12, 4),
    hold_id UUID,                    -- Reference to wallet hold
    
    -- Analytics
    transcript_summary TEXT,
    tool_calls_count INTEGER DEFAULT 0,
    user_turns_count INTEGER DEFAULT 0,
    agent_turns_count INTEGER DEFAULT 0,
    
    -- Metadata
    visitor_metadata JSONB,          -- Browser, location, etc.
    end_reason TEXT,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_sessions_tenant ON voice_sessions(tenant_id);
CREATE INDEX idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX idx_voice_sessions_created ON voice_sessions(created_at);
CREATE INDEX idx_voice_sessions_room ON voice_sessions(livekit_room_name);
-- Performance index for tenant analytics
CREATE INDEX idx_voice_sessions_tenant_started ON voice_sessions(tenant_id, started_at DESC);
-- Index for stale session cleanup
CREATE INDEX idx_voice_sessions_stale ON voice_sessions(created_at) 
    WHERE status IN ('pending', 'active');

-- Add FK from wallet_holds to voice_sessions
ALTER TABLE wallet_holds 
    ADD CONSTRAINT fk_wallet_holds_session 
    FOREIGN KEY (session_id) REFERENCES voice_sessions(id) ON DELETE RESTRICT;

-- ===========================================
-- 9. KNOWLEDGE BASE DOCUMENTS
-- ===========================================
CREATE TABLE kb_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_type VARCHAR(50),
    file_size_bytes INTEGER,
    content_hash VARCHAR(64),  -- SHA-256 for deduplication
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN (
        'processing', 'ready', 'error', 'deleted'
    )),
    error_message TEXT,
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_docs_tenant ON kb_documents(tenant_id);
CREATE INDEX idx_kb_docs_status ON kb_documents(status);

-- ===========================================
-- 10. KNOWLEDGE BASE EMBEDDINGS (Vector Store)
-- ===========================================
CREATE TABLE kb_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    embedding vector(1536) NOT NULL,  -- OpenAI text-embedding-3-small
    metadata JSONB,  -- page_number, section, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: tenant_id filter is MANDATORY for all queries
CREATE INDEX idx_kb_embeddings_tenant ON kb_embeddings(tenant_id);
CREATE INDEX idx_kb_embeddings_document ON kb_embeddings(document_id);

-- Vector similarity search index (IVFFlat)
-- lists = 100 is good for up to 10k rows per tenant
-- For larger datasets, consider HNSW index instead
CREATE INDEX idx_kb_embeddings_vector ON kb_embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Compound index for tenant-scoped vector search
CREATE INDEX idx_kb_embeddings_tenant_vector ON kb_embeddings(tenant_id);

-- ===========================================
-- 11. SESSION TRANSCRIPTS
-- ===========================================
CREATE TABLE session_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    turn_index INTEGER NOT NULL,
    speaker VARCHAR(20) CHECK (speaker IN ('user', 'agent')),
    content TEXT NOT NULL,
    timestamp_ms INTEGER,  -- Milliseconds from session start
    confidence NUMERIC(5, 4),  -- STT confidence (NUMERIC for precision)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transcripts_session ON session_transcripts(session_id);
CREATE INDEX idx_transcripts_tenant ON session_transcripts(tenant_id);

-- ===========================================
-- 12. SESSION TOOL CALLS
-- ===========================================
CREATE TABLE session_tool_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    input_params JSONB,
    output_result JSONB,
    success BOOLEAN,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tool_calls_session ON session_tool_calls(session_id);
CREATE INDEX idx_tool_calls_tenant ON session_tool_calls(tenant_id);

-- ===========================================
-- TRIGGERS: Updated At
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_voice_presets_updated_at
    BEFORE UPDATE ON voice_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tenant_voice_config_updated_at
    BEFORE UPDATE ON tenant_voice_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_voice_sessions_updated_at
    BEFORE UPDATE ON voice_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_kb_documents_updated_at
    BEFORE UPDATE ON kb_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- FUNCTION: Validate Session State Transitions
-- ===========================================
CREATE OR REPLACE FUNCTION validate_session_state_transition()
RETURNS TRIGGER AS $$
DECLARE
    terminal_states session_status[] := ARRAY[
        'completed', 'failed', 'timeout', 'max_duration', 'insufficient_funds', 'cancelled'
    ]::session_status[];
BEGIN
    -- If old status is terminal, prevent ANY changes to status
    IF OLD.status = ANY(terminal_states) AND NEW.status != OLD.status THEN
        RAISE EXCEPTION 'Cannot change status of terminated session. Current status: %', OLD.status;
    END IF;
    
    -- Valid transitions
    IF OLD.status = 'pending' THEN
        IF NOT (NEW.status IN ('active', 'cancelled', 'failed')) THEN
            RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
        END IF;
    ELSIF OLD.status = 'active' THEN
        IF NOT (NEW.status = ANY(terminal_states)) THEN
            RAISE EXCEPTION 'Active session can only transition to terminal state, not %', NEW.status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_voice_sessions_state_machine
    BEFORE UPDATE OF status ON voice_sessions
    FOR EACH ROW EXECUTE FUNCTION validate_session_state_transition();

-- ===========================================
-- SEED: Default Voice Presets
-- ===========================================
INSERT INTO voice_presets (id, display_name, description, base_price_per_min, provider_cost_per_min, provider_config, sort_order) VALUES
('standard', 'Standard', 'Deepgram STT with OpenAI reasoning and Deepgram Aura voice for reliable everyday calls.', 2.00, 1.20,
 '{"stt": {"provider": "deepgram", "model": "nova-3"}, "llm": {"provider": "openai", "model": "gpt-4o-mini"}, "tts": {"provider": "deepgram", "model": "aura-2-thalia-en"}}',
 1),
('growth', 'Growth', 'Deepgram STT with Groq for low-latency conversations and ElevenLabs for premium voice quality.', 3.50, 2.10,
 '{"stt": {"provider": "deepgram", "model": "nova-3"}, "llm": {"provider": "groq", "model": "llama-3.1-8b-instant"}, "tts": {"provider": "elevenlabs", "model": "eleven_turbo_v2_5"}}',
 2),
('regional', 'Regional', 'Deepgram STT with OpenAI reasoning and Sarvam speech for India-focused customer conversations.', 3.00, 1.80,
 '{"stt": {"provider": "deepgram", "model": "nova-3"}, "llm": {"provider": "openai", "model": "gpt-4o-mini"}, "tts": {"provider": "sarvam", "model": "bulbul:v3"}}',
 3),
('lightning', 'Lightning Fast', 'Deepgram STT with Groq LLM and Deepgram Aura TTS for the lowest possible latency.', 2.50, 1.50,
 '{"stt": {"provider": "deepgram", "model": "nova-3"}, "llm": {"provider": "groq", "model": "llama-3.1-8b-instant"}, "tts": {"provider": "deepgram", "model": "aura-2-thalia-en"}}',
 4),
('gemini', 'Google Advanced (Gemini Flash)', 'Deepgram STT with Gemini 3.1 Flash (high free-tier limits) and Deepgram Aura TTS.', 3.00, 1.80,
 '{"stt": {"provider": "deepgram", "model": "nova-3"}, "llm": {"provider": "gemini", "model": "gemini-3.1-flash"}, "tts": {"provider": "deepgram", "model": "aura-2-thalia-en"}}',
 5),
('sarvam_full', 'Sarvam India Stack', 'End-to-end Sarvam AI for STT, LLM, and TTS. Optimized specifically for Indian regional languages and accents.', 2.80, 1.60,
 '{"stt": {"provider": "sarvam", "model": "saaras:v1"}, "llm": {"provider": "sarvam", "model": "sarvam-1"}, "tts": {"provider": "sarvam", "model": "bulbul:v3"}}',
 6);

-- ===========================================
-- SEED: Default Voice Personas
-- ===========================================
INSERT INTO voice_personas (id, display_name, gender, accent, language, provider_voice_ids) VALUES
('maya', 'Maya', 'female', 'Indian English', 'en-IN', 
 '{"deepgram": "aura-2-thalia-en", "elevenlabs": "EXAVITQu4vr4xnSDxMaL", "sarvam": "priya"}'),
('raj', 'Raj', 'male', 'Indian English', 'en-IN', 
 '{"deepgram": "aura-2-orion-en", "elevenlabs": "pNInz6obpgDQGcFmaJgB", "sarvam": "aditya"}'),
('sarah', 'Sarah', 'female', 'American', 'en-US', 
 '{"deepgram": "aura-2-luna-en", "elevenlabs": "21m00Tcm4TlvDq8ikWAM", "sarvam": "sophia"}'),
('james', 'James', 'male', 'British', 'en-GB', 
 '{"deepgram": "aura-2-arcas-en", "elevenlabs": "VR6AewLTigWG4xSOukaG", "sarvam": "kabir"}');

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE tenants IS 'Business customers using LeadMate Voice AI';
COMMENT ON TABLE voice_presets IS 'Price tiers abstracting STT/LLM/TTS provider combinations';
COMMENT ON TABLE voice_personas IS 'Available voice characters (accent, gender, personality)';
COMMENT ON TABLE tenant_voice_config IS 'Per-tenant agent configuration and behavior';
COMMENT ON TABLE wallets IS 'Prepaid wallet balance per tenant - uses NUMERIC for money precision';
COMMENT ON TABLE wallet_transactions IS 'Immutable audit log of all wallet operations';
COMMENT ON TABLE wallet_holds IS 'Temporary fund reservations during active sessions';
COMMENT ON TABLE voice_sessions IS 'Core unit of billing - state machine enforced via trigger';
COMMENT ON TABLE kb_embeddings IS 'Vector store for RAG - ALWAYS filter by tenant_id';
COMMENT ON TYPE session_status IS 'Enum for session state machine - prevents invalid transitions';
