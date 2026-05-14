-- ===========================================
-- PROPERTY MANAGEMENT CORE
-- Migration: 012_properties
-- Real Estate SaaS - Property Tables
-- ===========================================

-- Enable UUID extension (already enabled in 001, but safe to have)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- PROPERTY PROJECTS
-- Master-planned communities / developments
-- ===========================================
CREATE TABLE IF NOT EXISTS property_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    locality VARCHAR(255),
    builder_name VARCHAR(255),
    description TEXT,
    total_units INTEGER,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_property_projects_tenant ON property_projects(tenant_id);
CREATE INDEX idx_property_projects_city ON property_projects(city);
CREATE INDEX idx_property_projects_status ON property_projects(status);

-- ===========================================
-- PROPERTIES
-- Individual property listings
-- ===========================================
CREATE TYPE property_type AS ENUM (
    'apartment',
    'villa',
    'independent_house',
    'plot',
    'commercial',
    'other'
);

CREATE TYPE property_status AS ENUM (
    'available',
    'sold',
    'reserved',
    'under_construction'
);

CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES property_projects(id) ON DELETE SET NULL,
    
    -- Core property details
    property_name VARCHAR(255),
    property_type property_type NOT NULL DEFAULT 'apartment',
    status property_status DEFAULT 'available',
    
    -- Location
    city VARCHAR(100) NOT NULL,
    locality VARCHAR(255),
    address TEXT,
    pincode VARCHAR(10),
    
    -- Property specifications
    bhk_types TEXT[],  -- Array like ['2BHK', '3BHK']
    min_price NUMERIC(15, 2),
    max_price NUMERIC(15, 2),
    min_sqft INTEGER,
    max_sqft INTEGER,
    
    -- Builder/Project info
    builder_name VARCHAR(255),
    project_name VARCHAR(255),
    
    -- Key dates
    possession_date DATE,
    launch_date DATE,
    
    -- Features
    amenities_json JSONB DEFAULT '[]',
    description TEXT,
    
    -- Media
    image_urls TEXT[] DEFAULT '{}',
    video_url VARCHAR(500),
    brochure_url VARCHAR(500),
    
    -- Source tracking
    source_type VARCHAR(50) DEFAULT 'manual',  -- manual, csv_import, portal
    source_reference VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for filtering
CREATE INDEX idx_properties_tenant ON properties(tenant_id);
CREATE INDEX idx_properties_project ON properties(project_id);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_locality ON properties(locality);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_price ON properties(min_price, max_price);
CREATE INDEX idx_properties_bhk ON properties USING GIN(bhk_types);
CREATE INDEX idx_properties_created ON properties(created_at);

-- ===========================================
-- TRIGGER: Updated At
-- ===========================================
CREATE TRIGGER trg_property_projects_updated_at
    BEFORE UPDATE ON property_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();