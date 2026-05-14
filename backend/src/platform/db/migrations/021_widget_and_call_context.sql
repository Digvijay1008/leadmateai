-- Widget SDK public keys, domain authorization, and call-log context.

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS widget_key VARCHAR(80),
    ADD COLUMN IF NOT EXISTS allowed_domains TEXT[] DEFAULT '{}';

UPDATE tenants
SET widget_key = 'wk_' || replace(id::text, '-', '')
WHERE widget_key IS NULL;

ALTER TABLE tenants
    ALTER COLUMN widget_key SET NOT NULL;

ALTER TABLE tenants
    ALTER COLUMN widget_key SET DEFAULT ('wk_' || replace(uuid_generate_v4()::text, '-', ''));

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_widget_key ON tenants(widget_key);

ALTER TABLE voice_sessions
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(32),
    ADD COLUMN IF NOT EXISTS direction VARCHAR(16),
    ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_voice_sessions_direction ON voice_sessions(tenant_id, direction, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_phone_number ON voice_sessions(tenant_id, phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_lead_id ON voice_sessions(lead_id);
