import { fetchApi } from '@/lib/api-client';
import { Session, SessionsListResponse, SessionFilters } from '../types';

export const sessionsApi = {
  getSessions: (filters?: SessionFilters) => {
    const params = new URLSearchParams();
    if (filters?.period) params.append('period', filters.period);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.direction && filters.direction !== 'all') params.append('direction', filters.direction);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    return fetchApi<SessionsListResponse>(`/v1/voice/sessions?${params.toString()}`);
  },

  getSession: (sessionId: string) => {
    return fetchApi<Session>(`/v1/voice/sessions/${sessionId}`);
  },
};
