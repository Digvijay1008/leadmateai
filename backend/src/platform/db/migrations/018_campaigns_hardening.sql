-- Migration 018: Campaign Engine Hardening

-- Provide enums
CREATE TYPE campaign_call_status AS ENUM ('pending', 'processing', 'success', 'failed');
CREATE TYPE campaign_state AS ENUM ('draft', 'running', 'paused', 'completed');

-- Alter existing campaigns table to use the new campaign_state
ALTER TABLE campaigns ALTER COLUMN status TYPE VARCHAR(32);
ALTER TABLE campaigns DROP CONSTRAINT campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check CHECK (status IN ('draft', 'running', 'paused', 'completed'));

-- To transition from the old 'active' to 'running'
UPDATE campaigns SET status = 'running' WHERE status = 'active';

-- Drop the old campaign_leads table
DROP TABLE IF EXISTS campaign_leads CASCADE;

-- Create the new campaign_calls table as requested
CREATE TABLE IF NOT EXISTS campaign_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    status campaign_call_status NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the queue processor
CREATE INDEX IF NOT EXISTS idx_campaign_calls_queue ON campaign_calls(tenant_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaign_calls_campaign ON campaign_calls(campaign_id);

-- Update stats function if necessary? We'll do it from logic level initially.
