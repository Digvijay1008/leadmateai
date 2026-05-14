import { fetchApi } from './apiClient';
import type { Lead, LeadCreateInput, LeadUpdateInput, LeadFilters, LeadListResponse } from '@/types/lead';

export const leadsApi = {
  list: async (filters?: LeadFilters, page = 1, pageSize = 20): Promise<LeadListResponse> => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    
    if (filters?.status) params.set('status', filters.status);
    if (filters?.source) params.set('source', filters.source);
    if (filters?.search) params.set('search', filters.search);
    
    return fetchApi<LeadListResponse>(`/v1/leads?${params.toString()}`);
  },

  get: async (id: string): Promise<Lead> => {
    return fetchApi<Lead>(`/v1/leads/${id}`);
  },

  create: async (input: LeadCreateInput): Promise<Lead> => {
    return fetchApi<Lead>('/v1/leads', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update: async (id: string, input: LeadUpdateInput): Promise<Lead> => {
    return fetchApi<Lead>(`/v1/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  delete: async (id: string): Promise<void> => {
    return fetchApi<void>(`/v1/leads/${id}`, {
      method: 'DELETE',
    });
  },
};