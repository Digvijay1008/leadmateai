import { fetchApi } from './apiClient';
import type { DashboardSummary, SessionStats, AnalyticsTimeRange } from '@/types/analytics';

export const analyticsApi = {
  dashboard: async (): Promise<DashboardSummary> => {
    return fetchApi<DashboardSummary>('/v1/analytics/dashboard');
  },

  overview: async (period?: string): Promise<any> => {
    const params = period ? `?period=${period}` : '';
    return fetchApi<any>(`/v1/analytics/overview${params}`);
  },

  sessions: async (period = '30days'): Promise<{ sessions: SessionStats[] }> => {
    return fetchApi<{ sessions: SessionStats[] }>(`/v1/analytics/sessions?period=${period}`);
  },

  leads: async (period = '30days'): Promise<any> => {
    return fetchApi<any>(`/v1/analytics/leads?period=${period}`);
  },

  revenue: async (period = '30days'): Promise<any> => {
    return fetchApi<any>(`/v1/analytics/revenue?period=${period}`);
  },

  metrics: async (metric: string, timeRange?: string): Promise<{ data: number[]; labels: string[] }> => {
    const params = new URLSearchParams();
    params.set('metric', metric);
    if (timeRange) params.set('period', timeRange);
    return fetchApi<{ data: number[]; labels: string[] }>(`/v1/analytics/metrics?${params.toString()}`);
  },

  export: async (format: 'csv' | 'json', timeRange?: string): Promise<Blob> => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (timeRange) params.set('period', timeRange);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/export?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('tenant_token') : ''}`,
        'x-tenant-id': typeof window !== 'undefined' ? localStorage.getItem('tenant_id') || '' : '',
      },
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  },
};