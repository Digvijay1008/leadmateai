import { useQuery } from '@tanstack/react-query';
import { sessionsApi } from '../api';
import { SessionFilters } from '../types';

export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (filters?: SessionFilters) => [...sessionKeys.lists(), filters] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
};

export function useSessionsQuery(filters?: SessionFilters) {
  return useQuery({
    queryKey: sessionKeys.list(filters),
    queryFn: () => sessionsApi.getSessions(filters),
    staleTime: 30 * 1000, // 30s
  });
}

export function useSessionDetailQuery(sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: () => sessionsApi.getSession(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
}
