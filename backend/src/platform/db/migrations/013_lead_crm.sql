-- ===========================================
-- LEAD CRM EXPANSION
-- Migration: 013_lead_crm
-- Multi-tenant Real Estate Lead Management
-- ===========================================

-- Enable UUID extension (already enabled in 001, but safe to have)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- LEADS TABLE
-- Core lead entity with enriched fields
-- ===========================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    project_id UUID REFERENCES property_projects(id) ON DELETE SET NULL,
    assigned_agent_id UUID,

    -- Contact Information
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,

    -- Lead Classification
    source TEXT DEFAULT 'website' CHECK (source IN (
        'website', 'whatsapp', 'broker', 'referral', 'walkin', 'portal', 'campaign', 'other'
    )),
    status TEXT DEFAULT 'new' CHECK (status IN (
        'new', 'contacted', 'qualified', 'site_visit', 'negotiation', 'booked', 'lost'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

    -- Budget & Preferences
    budget_min NUMERIC(15, 2),
    budget_max NUMERIC(15, 2),
    preferred_location TEXT,
    property_type TEXT,

    -- Follow-up Tracking
    follow_up_at TIMESTAMPTZ,
    last_contacted_at TIMESTAMPTZ,
    notes_summary TEXT,

    -- Scoring
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for leads
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_assigned_agent ON leads(assigned_agent_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_follow_up ON leads(follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX idx_leads_property ON leads(property_id);
CREATE INDEX idx_leads_project ON leads(project_id);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_created ON leads(created_at);

-- Trigger for updated_at
CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- LEAD ACTIVITIES TABLE
-- Track all lead interactions
-- ===========================================
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'call', 'whatsapp', 'email', 'site_visit', 'followup', 'meeting', 'demo', 'other'
    )),
    channel TEXT CHECK (channel IN ('voice', 'whatsapp', 'email', 'sms', 'in_person', 'video')),
    description TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lead_activities
CREATE INDEX idx_lead_activities_tenant ON lead_activities(tenant_id);
CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX idx_lead_activities_created ON lead_activities(created_at DESC);

-- ===========================================
-- LEAD NOTES TABLE
-- Free-form notes on leads
-- ===========================================
CREATE TABLE IF NOT EXISTS lead_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lead_notes
CREATE INDEX idx_lead_notes_tenant ON lead_notes(tenant_id);
CREATE INDEX idx_lead_notes_lead ON lead_notes(lead_id);
CREATE INDEX idx_lead_notes_created ON lead_notes(created_at DESC);

-- ===========================================
-- LEAD ASSIGNMENTS TABLE
-- Track lead ownership transfers
-- ===========================================
CREATE TABLE IF NOT EXISTS lead_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL,
    assigned_by UUID NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lead_assignments
CREATE INDEX idx_lead_assignments_tenant ON lead_assignments(tenant_id);
CREATE INDEX idx_lead_assignments_lead ON lead_assignments(lead_id);
CREATE INDEX idx_lead_assignments_assigned_to ON lead_assignments(assigned_to);
CREATE INDEX idx_lead_assignments_assigned_at ON lead_assignments(assigned_at DESC);

-- ===========================================
-- LEAD STATUS HISTORY TABLE
-- Audit trail for lead status changes
-- ===========================================
CREATE TABLE IF NOT EXISTS lead_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lead_status_history
CREATE INDEX idx_lead_status_history_tenant ON lead_status_history(tenant_id);
CREATE INDEX idx_lead_status_history_lead ON lead_status_history(lead_id);
CREATE INDEX idx_lead_status_history_changed_at ON lead_status_history(changed_at DESC);

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE leads IS 'Primary lead entity for CRM - always filter by tenant_id';
COMMENT ON TABLE lead_activities IS 'Interaction log for each lead';
COMMENT ON TABLE lead_notes IS 'Free-form notes attached to leads';
COMMENT ON TABLE lead_assignments IS 'Lead ownership transfer history';
COMMENT ON TABLE lead_status_history IS 'Audit trail for lead status changes';

-- ===========================================
-- SEED: Optional sample lead statuses comment
-- ===========================================
-- Lead status flow: new → contacted → qualified → site_visit → negotiation → booked
-- Lost leads can transition from any status to 'lost' with reason captured in notes_summary