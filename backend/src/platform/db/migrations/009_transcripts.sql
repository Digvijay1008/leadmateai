-- ===========================================
-- Migration 009: Transcripts and Password Hash
-- Adds transcript storage to sessions and security to tenants
-- ===========================================

-- 1. Add transcript storage to voice_sessions
ALTER TABLE voice_sessions 
ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]';

-- 2. Add password_hash and email to tenants (for Dashboard login)
-- We also add a unique email constraint here
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
-- Update the status check to use what we need
DROP CONSTRAINT IF EXISTS tenants_status_check,
ADD CONSTRAINT tenants_status_check CHECK (status IN ('trial', 'active', 'suspended', 'cancelled'));

-- Add index on email for login lookups
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);

-- Add comment explaining transcript
COMMENT ON COLUMN voice_sessions.transcript IS 'Full textual conversation history as JSON array of {role, content}';
