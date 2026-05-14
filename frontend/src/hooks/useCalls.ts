import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/services/analytics.api';

export const callsKeys = {
  all: ['calls'] as const,
  lists: () => [...callsKeys.all, 'list'] as const,
  list: (period: string) => [...callsKeys.lists(), { period }] as const,
};

export function useCallsQuery(period: string = '7days') {
  return useQuery({
    queryKey: callsKeys.list(period),
    queryFn: () => analyticsApi.sessions(period),
  });
}