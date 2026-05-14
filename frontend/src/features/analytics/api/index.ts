import { fetchApi } from '@/lib/api-client';
import { DashboardSummary, CallStats, AnalyticsFilters } from '../types';

export const analyticsApi = {
  getDashboardSummary: () => {
    return fetchApi<DashboardSummary>('/v1/analytics/dashboard');
  },

  getCallStats: (filters?: AnalyticsFilters) => {
    const params = new URLSearchParams();
    if (filters?.period) params.append('period', filters.period);
    // Unwraps the { sessions: [] } structure from backend
    return fetchApi<any>(`/v1/analytics/sessions?${params.toString()}`).then(res => {
      if (res && res.sessions && res.sessions.length > 0) {
        // Aggregate assuming the backend returns array of daily stats
        const data = res.sessions;
        return {
          total_sessions: data.reduce((acc: number, val: any) => acc + (val.total_sessions || 0), 0),
          completed_sessions: data.reduce((acc: number, val: any) => acc + (val.completed_sessions || 0), 0),
          failed_sessions: data.reduce((acc: number, val: any) => acc + (val.failed_sessions || 0), 0),
          avg_duration: data.length > 0 ? (data.reduce((acc: number, val: any) => acc + (val.avg_duration || 0), 0) / data.length) : 0,
          total_duration: data.reduce((acc: number, val: any) => acc + (val.total_duration || 0), 0),
          total_cost: data.reduce((acc: number, val: any) => acc + (parseFloat(val.total_cost) || 0), 0),
        } as CallStats;
      }
      return { total_sessions: 0, completed_sessions: 0, failed_sessions: 0, avg_duration: 0, total_duration: 0, total_cost: 0 };
    });
  },

  getRevenueStats: (filters?: AnalyticsFilters) => {
    const params = new URLSearchParams();
    if (filters?.period) params.append('period', filters.period);
    return fetchApi<any>(`/v1/analytics/revenue?${params.toString()}`).then(res => {
      if (res && res.revenue) return res.revenue;
      return [];
    });
  },
};
