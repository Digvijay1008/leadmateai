-- ===========================================
-- ANALYTICS PIPELINE
-- Migration: 016_analytics
-- Real-time analytics for dashboard
-- ===========================================

-- ===========================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ===========================================

-- Session summary by day for efficient analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_session_daily_summary AS
SELECT 
    tenant_id,
    DATE(created_at) as session_date,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_sessions,
    COUNT(*) FILTER (WHERE status = 'timeout') as timeout_sessions,
    COUNT(*) FILTER (WHERE status = 'insufficient_funds') as insufficient_funds_sessions,
    SUM(duration_seconds) as total_duration_seconds,
    SUM(billed_seconds) as total_billed_seconds,
    SUM(cost_total) as total_cost,
    AVG(duration_seconds) as avg_duration_seconds,
    AVG(billed_seconds) as avg_billed_seconds,
    AVG(cost_total) as avg_cost
FROM voice_sessions
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY tenant_id, DATE(created_at);

CREATE INDEX IF NOT EXISTS idx_mv_session_daily_tenant_date 
    ON mv_session_daily_summary(tenant_id, session_date DESC);

-- Lead status funnel for conversion tracking
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_lead_status_funnel AS
SELECT 
    tenant_id,
    DATE(created_at) as lead_date,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status = 'new') as new_leads,
    COUNT(*) FILTER (WHERE status = 'contacted') as contacted_leads,
    COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
    COUNT(*) FILTER (WHERE status = 'site_visit') as site_visit_leads,
    COUNT(*) FILTER (WHERE status = 'negotiation') as negotiation_leads,
    COUNT(*) FILTER (WHERE status = 'booked') as booked_leads,
    COUNT(*) FILTER (WHERE status = 'lost') as lost_leads,
    AVG(lead_score) as avg_lead_score
FROM leads
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY tenant_id, DATE(created_at);

CREATE INDEX IF NOT EXISTS idx_mv_lead_funnel_tenant_date 
    ON mv_lead_status_funnel(tenant_id, lead_date DESC);

-- Revenue/wallet summary by day
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_revenue_daily_summary AS
SELECT 
    wt.wallet_id as tenant_id,
    DATE(wt.created_at) as transaction_date,
    SUM(CASE WHEN wt.type IN ('usage_deduction', 'hold_settled') THEN -wt.amount ELSE wt.amount END) as revenue,
    SUM(CASE WHEN wt.type = 'topup' THEN wt.amount ELSE 0 END) as topups,
    SUM(CASE WHEN wt.type IN ('usage_deduction', 'hold_settled') THEN wt.amount ELSE 0 END) as usage,
    COUNT(*) as transaction_count
FROM wallet_transactions wt
WHERE wt.created_at >= NOW() - INTERVAL '90 days'
GROUP BY wt.wallet_id, DATE(wt.created_at);

CREATE INDEX IF NOT EXISTS idx_mv_revenue_daily_tenant_date 
    ON mv_revenue_daily_summary(tenant_id, transaction_date DESC);

-- ===========================================
-- FUNCTION: Refresh all analytics views
-- ===========================================
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_session_daily_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_status_funnel;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- FUNCTION: Get session analytics for dashboard
-- ===========================================
CREATE OR REPLACE FUNCTION get_session_analytics(
    p_tenant_id uuid,
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    period date,
    total_sessions int,
    completed_sessions int,
    failed_sessions int,
    total_duration bigint,
    total_billed bigint,
    total_cost numeric,
    avg_duration float,
    avg_cost float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        session_date as period,
        SUM(total_sessions)::int as total_sessions,
        SUM(completed_sessions)::int as completed_sessions,
        SUM(failed_sessions)::int as failed_sessions,
        SUM(total_duration_seconds)::bigint as total_duration,
        SUM(total_billed_seconds)::bigint as total_billed,
        SUM(total_cost)::numeric(15,2) as total_cost,
        AVG(avg_duration_seconds)::float as avg_duration,
        AVG(avg_cost)::float as avg_cost
    FROM mv_session_daily_summary
    WHERE tenant_id = p_tenant_id
      AND session_date >= p_start_date
      AND session_date <= p_end_date
    GROUP BY session_date
    ORDER BY session_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- FUNCTION: Get lead funnel analytics
-- ===========================================
CREATE OR REPLACE FUNCTION get_lead_funnel_analytics(
    p_tenant_id uuid,
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    period date,
    total_leads int,
    new_leads int,
    contacted_leads int,
    qualified_leads int,
    site_visit_leads int,
    negotiation_leads int,
    booked_leads int,
    lost_leads int,
    conversion_rate float,
    avg_score float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lead_date as period,
        SUM(total_leads)::int as total_leads,
        SUM(new_leads)::int as new_leads,
        SUM(contacted_leads)::int as contacted_leads,
        SUM(qualified_leads)::int as qualified_leads,
        SUM(site_visit_leads)::int as site_visit_leads,
        SUM(negotiation_leads)::int as negotiation_leads,
        SUM(booked_leads)::int as booked_leads,
        SUM(lost_leads)::int as lost_leads,
        CASE 
            WHEN SUM(total_leads) > 0 
            THEN (SUM(booked_leads)::float / SUM(total_leads)::float) * 100 
            ELSE 0 
        END as conversion_rate,
        AVG(avg_lead_score)::float as avg_score
    FROM mv_lead_status_funnel
    WHERE tenant_id = p_tenant_id
      AND lead_date >= p_start_date
      AND lead_date <= p_end_date
    GROUP BY lead_date
    ORDER BY lead_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- FUNCTION: Get revenue analytics
-- ===========================================
CREATE OR REPLACE FUNCTION get_revenue_analytics(
    p_tenant_id uuid,
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    period date,
    revenue numeric,
    topups numeric,
    usage_cost numeric,
    transaction_count int
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        transaction_date as period,
        SUM(revenue)::numeric(15,2) as revenue,
        SUM(topups)::numeric(15,2) as topups,
        SUM(usage)::numeric(15,2) as usage_cost,
        SUM(transaction_count)::int as transaction_count
    FROM mv_revenue_daily_summary
    WHERE tenant_id = p_tenant_id
      AND transaction_date >= p_start_date
      AND transaction_date <= p_end_date
    GROUP BY transaction_date
    ORDER BY transaction_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- SCHEDULE: Auto-refresh views every hour
-- ===========================================
-- Note: Requires pg_cron or similar to run
-- For manual refresh, call: SELECT refresh_analytics_views();

-- Create a simple cron job if available (optional)
-- SELECT cron.schedule('refresh-analytics', '0 * * * *', 'SELECT refresh_analytics_views()');

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON MATERIALIZED VIEW mv_session_daily_summary IS 'Daily session aggregation for analytics';
COMMENT ON MATERIALIZED VIEW mv_lead_status_funnel IS 'Daily lead status funnel for conversion tracking';
COMMENT ON MATERIALIZED VIEW mv_revenue_daily_summary IS 'Daily revenue aggregation for billing analytics';
COMMENT ON FUNCTION get_session_analytics IS 'Get session analytics for date range';
COMMENT ON FUNCTION get_lead_funnel_analytics IS 'Get lead funnel analytics for date range';
COMMENT ON FUNCTION get_revenue_analytics IS 'Get revenue analytics for date range';