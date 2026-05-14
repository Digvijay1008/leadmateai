-- ===========================================
-- LEADMATE VOICE AI - DATABASE HARDENING
-- Migration: 002_hardening
-- Purpose: Add safety constraints and prepared tables for PSTN
-- ===========================================

-- 1. BILLING SAFETY: Prevent negative costs/durations
-- Even though app logic prevents this, DB should reject it as last line of defense.

ALTER TABLE voice_sessions 
    ADD CONSTRAINT check_cost_positive CHECK (cost_total IS NULL OR cost_total >= 0);

ALTER TABLE voice_sessions 
    ADD CONSTRAINT check_duration_positive CHECK (duration_seconds IS NULL OR duration_seconds >= 0);

ALTER TABLE voice_presets 
    ADD CONSTRAINT check_price_positive CHECK (base_price_per_min >= 0);

-- 2. DATA INTEGRITY: Ensure slugs are lowercase (for URLs)
-- Safe to apply now as we only have test data.
UPDATE tenants SET slug = LOWER(slug);
ALTER TABLE tenants 
    ADD CONSTRAINT check_slug_format CHECK (slug ~* '^[a-z0-9-]+$');

-- 3. PSTN READINESS (Future Proofing)
-- Create the table structure now so it's ready for Phase 3/4 without schema changes.

CREATE TYPE phone_provider_type AS ENUM ('twilio', 'plivo', 'exotel', 'sip_trunk');

CREATE TABLE IF NOT EXISTS tenant_phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL UNIQUE, -- E.164 format
    provider phone_provider_type NOT NULL,
    provider_resource_id VARCHAR(100),        -- e.g. Twilio SID
    capabilities JSONB DEFAULT '["inbound"]', -- inbound, outbound, sms
    label VARCHAR(50),                        -- e.g. "Main Support Line"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure phone number follows E.164 format (+1234567890)
    CONSTRAINT check_e164_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

CREATE INDEX idx_phone_numbers_tenant ON tenant_phone_numbers(tenant_id);
CREATE INDEX idx_phone_numbers_active ON tenant_phone_numbers(phone_number) WHERE is_active = true;

-- 4. TRIGGER: Update timestamp for phone numbers
CREATE TRIGGER trg_tenant_phone_numbers_updated_at
    BEFORE UPDATE ON tenant_phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. PERFORMANCE: Add index for common "Find Tenant by User" query
-- This is used in auth.ts middleware on every request.
CREATE INDEX IF NOT EXISTS idx_tenants_user_lookup ON tenants(user_id);

