import { queryOne, queryMany } from '../../../platform/index.js';

export interface SessionAnalytics {
    period: Date;
    total_sessions: number;
    completed_sessions: number;
    failed_sessions: number;
    total_duration: number;
    total_billed: number;
    total_cost: number;
    avg_duration: number;
    avg_cost: number;
}

export interface LeadFunnelAnalytics {
    period: Date;
    total_leads: number;
    new_leads: number;
    contacted_leads: number;
    qualified_leads: number;
    site_visit_leads: number;
    negotiation_leads: number;
    booked_leads: number;
    lost_leads: number;
    conversion_rate: number;
    avg_score: number;
}

export interface RevenueAnalytics {
    period: Date;
    revenue: number;
    topups: number;
    usage_cost: number;
    transaction_count: number;
}

export interface DashboardSummary {
    sessions_today: number;
    sessions_this_month: number;
    revenue_this_month: number;
    leads_this_month: number;
    leads_converted: number;
    active_leads: number;
    wallet_balance: number;
    avg_session_cost: number;
    conversion_rate: number;
}

function getDateRange(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    let startDate: Date;

    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '90days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'last_month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
}

export async function getSessionAnalytics(
    tenantId: string,
    period: string = '30days'
): Promise<SessionAnalytics[]> {
    const { startDate, endDate } = getDateRange(period);

    const result = await queryMany<SessionAnalytics>(
        `SELECT 
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
        WHERE tenant_id = $1
          AND session_date >= $2
          AND session_date < $3
        GROUP BY session_date
        ORDER BY session_date DESC`,
        [tenantId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    return result.map(r => ({
        ...r,
        period: new Date(r.period),
    }));
}

export async function getLeadFunnelAnalytics(
    tenantId: string,
    period: string = '30days'
): Promise<LeadFunnelAnalytics[]> {
    const { startDate, endDate } = getDateRange(period);

    const result = await queryMany<LeadFunnelAnalytics>(
        `SELECT 
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
                THEN (SUM(booked_leads)::float / NULLIF(SUM(total_leads), 0)::float) * 100 
                ELSE 0 
            END as conversion_rate,
            AVG(avg_lead_score)::float as avg_score
        FROM mv_lead_status_funnel
        WHERE tenant_id = $1
          AND lead_date >= $2
          AND lead_date < $3
        GROUP BY lead_date
        ORDER BY lead_date DESC`,
        [tenantId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    return result.map(r => ({
        ...r,
        period: new Date(r.period),
    }));
}

export async function getRevenueAnalytics(
    tenantId: string,
    period: string = '30days'
): Promise<RevenueAnalytics[]> {
    const { startDate, endDate } = getDateRange(period);

    const result = await queryMany<RevenueAnalytics>(
        `SELECT 
            transaction_date as period,
            SUM(revenue)::numeric(15,2) as revenue,
            SUM(topups)::numeric(15,2) as topups,
            SUM(usage_cost)::numeric(15,2) as usage_cost,
            SUM(transaction_count)::int as transaction_count
        FROM mv_revenue_daily_summary
        WHERE tenant_id = $1
          AND transaction_date >= $2
          AND transaction_date < $3
        GROUP BY transaction_date
        ORDER BY transaction_date DESC`,
        [tenantId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    return result.map(r => ({
        ...r,
        period: new Date(r.period),
    }));
}

export async function getDashboardSummary(tenantId: string): Promise<DashboardSummary> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    const [sessionsToday, sessionsThisMonth, revenueThisMonth, leadsThisMonth, leadStats, walletBalance] = await Promise.all([
        queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM voice_sessions 
             WHERE tenant_id = $1 AND DATE(created_at) = $2`,
            [tenantId, todayStr]
        ),
        queryOne<{ total: string; avg_cost: string }>(
            `SELECT COUNT(*) as total, AVG(cost_total)::float as avg_cost 
             FROM voice_sessions 
             WHERE tenant_id = $1 AND DATE(created_at) >= $2`,
            [tenantId, monthStart]
        ),
        queryOne<{ total: string }>(
            `SELECT COALESCE(SUM(amount), 0)::numeric(15,2) as total 
             FROM wallet_transactions 
             WHERE wallet_id = $1 AND type IN ('usage_deduction', 'hold_settled') 
             AND DATE(created_at) >= $2`,
            [tenantId, monthStart]
        ),
        queryOne<{ total: string }>(
            `SELECT COUNT(*) as total FROM leads 
             WHERE tenant_id = $1 AND DATE(created_at) >= $2`,
            [tenantId, monthStart]
        ),
        queryOne<{ converted: string; active: string }>(
            `SELECT 
                COUNT(*) FILTER (WHERE status = 'booked')::text as converted,
                COUNT(*) FILTER (WHERE status IN ('new', 'contacted', 'qualified', 'site_visit', 'negotiation'))::text as active
             FROM leads WHERE tenant_id = $1`,
            [tenantId]
        ),
        queryOne<{ balance: string }>(
            `SELECT balance::text as balance FROM wallets WHERE tenant_id = $1`,
            [tenantId]
        ),
    ]);

    return {
        sessions_today: parseInt(sessionsToday?.count ?? '0', 10),
        sessions_this_month: parseInt(sessionsThisMonth?.total ?? '0', 10),
        revenue_this_month: parseFloat(revenueThisMonth?.total ?? '0'),
        leads_this_month: parseInt(leadsThisMonth?.total ?? '0', 10),
        leads_converted: parseInt(leadStats?.converted ?? '0', 10),
        active_leads: parseInt(leadStats?.active ?? '0', 10),
        wallet_balance: parseFloat(walletBalance?.balance ?? '0'),
        avg_session_cost: parseFloat(sessionsThisMonth?.avg_cost ?? '0'),
        conversion_rate: parseInt(leadStats?.converted ?? '0', 10) / Math.max(parseInt(leadsThisMonth?.total ?? '1', 10), 1) * 100,
    };
}

export async function refreshAnalyticsViews(): Promise<void> {
    await queryOne(`SELECT refresh_analytics_views()`);
}
