import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import { AnalyticsFilters } from '../types';

export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: () => [...analyticsKeys.all, 'dashboard'] as const,
  callStats: (filters?: AnalyticsFilters) => [...analyticsKeys.all, 'callStats', filters] as const,
};

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: analyticsKeys.dashboard(),
    queryFn: () => analyticsApi.getDashboardSummary(),
    staleTime: 30 * 1000, // 30s
  });
}

export function useCallStatsQuery(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.callStats(filters),
    queryFn: () => analyticsApi.getCallStats(filters),
    staleTime: 30 * 1000, // 30s
  });
}

export function useRevenueStatsQuery(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: [...analyticsKeys.all, 'revenue', filters],
    queryFn: () => analyticsApi.getRevenueStats(filters),
    staleTime: 30 * 1000, // 30s
  });
}
