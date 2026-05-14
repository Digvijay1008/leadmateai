-- Appointment availability config per tenant
CREATE TABLE IF NOT EXISTS tenant_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Monday, 6=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actual appointments booked
CREATE TABLE IF NOT EXISTS tenant_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES voice_sessions(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  patient_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  service_type VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'confirmed',
  booking_id VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads captured during calls
CREATE TABLE IF NOT EXISTS tenant_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES voice_sessions(id),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  interest TEXT NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'new',
  lead_id VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business info per tenant
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS business_info JSONB DEFAULT '{
  "hours": "Monday to Saturday, 9am to 7pm",
  "services": "General consultation",
  "location": "Please contact us for address",
  "fees": "Please contact us for fee details"
}';

-- Seed test availability for demo tenant
INSERT INTO tenant_availability 
  (tenant_id, day_of_week, start_time, end_time, slot_duration_minutes)
VALUES
  ('32f67511-cc64-4856-bceb-86f21797e206', 0, '09:00', '17:00', 30),
  ('32f67511-cc64-4856-bceb-86f21797e206', 1, '09:00', '17:00', 30),
  ('32f67511-cc64-4856-bceb-86f21797e206', 2, '09:00', '17:00', 30),
  ('32f67511-cc64-4856-bceb-86f21797e206', 3, '09:00', '17:00', 30),
  ('32f67511-cc64-4856-bceb-86f21797e206', 4, '09:00', '17:00', 30)
ON CONFLICT DO NOTHING;
