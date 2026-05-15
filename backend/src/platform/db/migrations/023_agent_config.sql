-- ===========================================
-- LEADMATE VOICE AI - DATABASE SCHEMA
-- Migration: 023_agent_config
-- ===========================================

-- Identity
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS agent_name VARCHAR(100) DEFAULT 'AI Assistant';
-- welcome_message is currently greeting_message in tenants
-- personality
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS personality TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_context TEXT;

-- LLM
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS llm_provider VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS temperature NUMERIC(3, 2) DEFAULT 0.7;

-- Voice / Audio
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tts_provider VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tts_voice_id VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tts_language VARCHAR(50) DEFAULT 'en-US';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS speech_speed NUMERIC(3, 2) DEFAULT 1.0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS interruption_sensitivity VARCHAR(50) DEFAULT 'immediate';

-- STT
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stt_provider VARCHAR(50) DEFAULT 'deepgram';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stt_language VARCHAR(50) DEFAULT 'en-US';

-- Tools
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enabled_tools TEXT[] DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS transfer_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS capture_lead_enabled BOOLEAN DEFAULT false;

-- Call Behavior
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS silence_timeout_ms INTEGER DEFAULT 10000;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_call_duration INTEGER DEFAULT 900;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voicemail_behavior VARCHAR(50) DEFAULT 'hangup';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fallback_message TEXT DEFAULT 'I am having trouble connecting. Please try again later.';

-- ===========================================
-- TENANT AVAILABILITY (For Bookings)
-- ===========================================
CREATE TABLE IF NOT EXISTS tenant_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 30,
    buffer_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_availability_tenant ON tenant_availability(tenant_id);
