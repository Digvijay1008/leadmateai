-- ===========================================
-- Migration 019: SIP BYOD Architecture
-- Removes Plivo dependency, adds tenant SIP trunks
-- ===========================================

-- 1. Create tenant SIP trunks table
CREATE TABLE IF NOT EXISTS tenant_sip_trunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Primary Trunk',
    provider_name VARCHAR(50) NOT NULL DEFAULT 'custom',
    sip_host VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    password_encrypted TEXT,
    outbound_proxy VARCHAR(255),
    transport VARCHAR(10) DEFAULT 'udp' CHECK (transport IN ('udp', 'tcp', 'tls')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sip_trunks_tenant ON tenant_sip_trunks(tenant_id);

-- 2. Add sip_trunk_id to phone_numbers (nullable FK)
ALTER TABLE phone_numbers
    ADD COLUMN IF NOT EXISTS sip_trunk_id UUID REFERENCES tenant_sip_trunks(id) ON DELETE SET NULL;

-- 3. Update provider default from 'plivo' to 'sip'
ALTER TABLE phone_numbers
    ALTER COLUMN provider SET DEFAULT 'sip';

-- 4. Add agent assignment column if missing
ALTER TABLE phone_numbers
    ADD COLUMN IF NOT EXISTS assigned_agent_id UUID;

ALTER TABLE phone_numbers
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Migrate existing phone numbers provider from 'plivo' to 'sip'
UPDATE phone_numbers SET provider = 'sip' WHERE provider = 'plivo';

-- 6. Drop the plivo_call_sessions table (no longer needed)
DROP TABLE IF EXISTS plivo_call_sessions;
