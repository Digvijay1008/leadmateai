-- ===========================================
-- Migration 020: LiveKit Trunk & Dispatch Rule IDs
-- Adds LiveKit-assigned IDs to tenant_sip_trunks
-- ===========================================

-- LiveKit returns ST_xxx IDs when trunks are registered.
-- These are required for createSipParticipant() calls.
ALTER TABLE tenant_sip_trunks
    ADD COLUMN IF NOT EXISTS livekit_trunk_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS livekit_inbound_trunk_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS livekit_dispatch_rule_id VARCHAR(64);

-- Index for quick lookups by LiveKit trunk ID
CREATE INDEX IF NOT EXISTS idx_sip_trunks_livekit_id ON tenant_sip_trunks(livekit_trunk_id);
