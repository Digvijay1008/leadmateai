-- ===========================================
-- SEARCH PERFORMANCE INDEXES
-- Migration: 014_search_indexes
-- Optimize property and project search queries
-- ===========================================

-- ===========================================
-- COMPOSITE INDEXES FOR PROPERTY SEARCH
-- ===========================================

-- Composite index for common filter combination: tenant + status + city
CREATE INDEX IF NOT EXISTS idx_properties_search_tenant_status_city 
    ON properties(tenant_id, status, city);

-- Composite index for price range queries
CREATE INDEX IF NOT EXISTS idx_properties_search_price 
    ON properties(tenant_id, status, min_price, max_price);

-- Composite index for location search
CREATE INDEX IF NOT EXISTS idx_properties_search_location 
    ON properties(tenant_id, status, locality);

-- Composite index for project-based filtering
CREATE INDEX IF NOT EXISTS idx_properties_search_project 
    ON properties(tenant_id, status, project_id);

-- Composite index for type + status filtering
CREATE INDEX IF NOT EXISTS idx_properties_search_type_status 
    ON properties(tenant_id, status, property_type);

-- ===========================================
-- COMPOSITE INDEXES FOR PROJECT SEARCH
-- ===========================================

-- Composite index for project search by tenant + status + city
CREATE INDEX IF NOT EXISTS idx_projects_search_tenant_status_city 
    ON property_projects(tenant_id, status, city);

-- Composite index for project search by search term
CREATE INDEX IF NOT EXISTS idx_projects_search_search 
    ON property_projects 
    USING GIN (to_tsvector('english', project_name || ' ' || COALESCE(locality, '') || ' ' || COALESCE(builder_name, '')));

-- ===========================================
-- LEAD INDEXES FOR MATCHING
-- ===========================================

-- Index for lead matching queries (budget range)
CREATE INDEX IF NOT EXISTS idx_leads_budget 
    ON leads(tenant_id, status, budget_min, budget_max);

-- Index for lead matching queries (location preference)
CREATE INDEX IF NOT EXISTS idx_leads_location 
    ON leads(tenant_id, status, preferred_location);

-- Index for lead matching queries (property type)
CREATE INDEX IF NOT EXISTS idx_leads_property_type 
    ON leads(tenant_id, status, property_type);

-- ===========================================
-- TEXT SEARCH INDEXES (Optional - for larger datasets)
-- ===========================================

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for fuzzy property name search
CREATE INDEX IF NOT EXISTS idx_properties_property_name_trgm 
    ON properties USING gin (property_name gin_trgm_ops);

-- Trigram index for fuzzy locality search
CREATE INDEX IF NOT EXISTS idx_properties_locality_trgm 
    ON properties USING gin (locality gin_trgm_ops);

-- Trigram index for fuzzy builder name search
CREATE INDEX IF NOT EXISTS idx_properties_builder_name_trgm 
    ON properties USING gin (builder_name gin_trgm_ops);

-- Trigram index for project name search
CREATE INDEX IF NOT EXISTS idx_projects_project_name_trgm 
    ON property_projects USING gin (project_name gin_trgm_ops);

-- ===========================================
-- ANALYTICS INDEXES
-- ===========================================

-- Index for session analytics by tenant + date
CREATE INDEX IF NOT EXISTS idx_voice_sessions_tenant_date 
    ON voice_sessions(tenant_id, created_at DESC);

-- Index for lead analytics by tenant + status + created
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status_created 
    ON leads(tenant_id, status, created_at DESC);

-- Index for lead follow-up scheduling
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_scheduled 
    ON leads(tenant_id, status, follow_up_at) 
    WHERE follow_up_at IS NOT NULL;

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON INDEX idx_properties_search_tenant_status_city IS 'Used for: /v1/properties?status=&city=';
COMMENT ON INDEX idx_properties_search_price IS 'Used for: /v1/properties?min_price=&max_price=';
COMMENT ON INDEX idx_properties_search_location IS 'Used for: /v1/properties?locality=';
COMMENT ON INDEX idx_properties_search_project IS 'Used for: /v1/properties?project_id=';
COMMENT ON INDEX idx_leads_budget IS 'Used for property matching: lead budget range';
COMMENT ON INDEX idx_leads_location IS 'Used for property matching: lead location preference';
COMMENT ON INDEX idx_leads_property_type IS 'Used for property matching: lead property type';

-- ===========================================
-- MONITORING NOTE
-- ===========================================
-- To check index usage:
-- SELECT indexrelname, idx_scan
-- FROM pg_stat_user_indexes
-- WHERE relname IN ('properties', 'property_projects', 'leads')
-- ORDER BY idx_scan DESC;

-- To analyze query performance:
-- EXPLAIN ANALYZE SELECT * FROM properties 
-- WHERE tenant_id = 'xxx' AND status = 'available' AND city = 'yyy';