-- PLIVO PSTN INTEGRATION MIGRATION

CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number VARCHAR(20) UNIQUE NOT NULL,  -- E.164 format: +918045678901
  country_code VARCHAR(5) DEFAULT '+91',
  provider VARCHAR(20) DEFAULT 'plivo',
  is_active BOOLEAN DEFAULT true,
  monthly_cost DECIMAL(10,2) DEFAULT 0,
  plivo_number_id VARCHAR(100),  -- Plivo's internal ID for the number
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plivo_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_uuid VARCHAR(100) UNIQUE NOT NULL,
  session_id UUID REFERENCES voice_sessions(id),
  tenant_id UUID NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'connecting'
    CHECK (status IN ('connecting','active','completed','failed')),
  plivo_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for number lookups
CREATE INDEX IF NOT EXISTS idx_phone_numbers_number ON phone_numbers(number);

-- Index for CallUUID lookups
CREATE INDEX IF NOT EXISTS idx_plivo_sessions_call_uuid ON plivo_call_sessions(call_uuid);

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_plivo_sessions_tenant ON plivo_call_sessions(tenant_id);

-- Assign test number to LeadMate Demo tenant
INSERT INTO phone_numbers (tenant_id, number, is_active)
SELECT id, '+918045678901', true
FROM tenants
WHERE business_name = 'LeadMate Demo'
   OR business_name = 'Sharma Dental Clinic'
ON CONFLICT (number) DO NOTHING;

