import {
    getSessionAnalytics,
    getLeadFunnelAnalytics,
    getRevenueAnalytics,
    getDashboardSummary,
    refreshAnalyticsViews,
    type SessionAnalytics,
    type LeadFunnelAnalytics,
    type RevenueAnalytics,
    type DashboardSummary,
} from '../repositories/analytics.repository.js';
import { ValidationError } from '../../../shared/index.js';

export type AnalyticsPeriod = 'today' | 'yesterday' | '7days' | '30days' | '90days' | 'this_month' | 'last_month';

const VALID_PERIODS: AnalyticsPeriod[] = ['today', 'yesterday', '7days', '30days', '90days', 'this_month', 'last_month'];

export async function getSessionAnalyticsService(
    tenantId: string,
    period: string = '30days'
): Promise<SessionAnalytics[]> {
    if (!VALID_PERIODS.includes(period as AnalyticsPeriod)) {
        throw new ValidationError(`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`);
    }

    return getSessionAnalytics(tenantId, period);
}

export async function getLeadFunnelAnalyticsService(
    tenantId: string,
    period: string = '30days'
): Promise<LeadFunnelAnalytics[]> {
    if (!VALID_PERIODS.includes(period as AnalyticsPeriod)) {
        throw new ValidationError(`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`);
    }

    return getLeadFunnelAnalytics(tenantId, period);
}

export async function getRevenueAnalyticsService(
    tenantId: string,
    period: string = '30days'
): Promise<RevenueAnalytics[]> {
    if (!VALID_PERIODS.includes(period as AnalyticsPeriod)) {
        throw new ValidationError(`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`);
    }

    return getRevenueAnalytics(tenantId, period);
}

export async function getDashboardSummaryService(
    tenantId: string
): Promise<DashboardSummary> {
    return getDashboardSummary(tenantId);
}

export async function refreshAnalyticsService(): Promise<{ success: boolean; message: string }> {
    try {
        await refreshAnalyticsViews();
        return { success: true, message: 'Analytics views refreshed successfully' };
    } catch (error) {
        console.error('[Analytics] Refresh error:', error);
        return { success: false, message: 'Failed to refresh analytics views' };
    }
}

export interface OverviewReport {
    summary: DashboardSummary;
    sessions: SessionAnalytics[];
    leads: LeadFunnelAnalytics[];
    revenue: RevenueAnalytics[];
}

export async function getOverviewReportService(
    tenantId: string,
    period: string = '30days'
): Promise<OverviewReport> {
    const [summary, sessions, leads, revenue] = await Promise.all([
        getDashboardSummary(tenantId),
        getSessionAnalytics(tenantId, period),
        getLeadFunnelAnalytics(tenantId, period),
        getRevenueAnalytics(tenantId, period),
    ]);

    return { summary, sessions, leads, revenue };
}
