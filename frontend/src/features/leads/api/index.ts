import { fetchApi } from '@/lib/api-client';
import { Lead, LeadFilters, LeadCreateInput, LeadUpdateInput } from '../types';

export const leadsApi = {
  getLeads: (filters?: LeadFilters, page = 1, pageSize = 20) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.search) params.append('search', filters.search);
    params.append('limit', pageSize.toString());
    params.append('offset', ((page - 1) * pageSize).toString());

    return fetchApi<{ leads: Lead[]; total: number }>(`/v1/leads?${params.toString()}`);
  },

  getLeadById: (id: string) => fetchApi<Lead>(`/v1/leads/${id}`),

  createLead: (data: LeadCreateInput) =>
    fetchApi<Lead>('/v1/leads', {
      method: 'POST',
      data,
    }),

  updateLead: (id: string, data: LeadUpdateInput) =>
    fetchApi<Lead>(`/v1/leads/${id}`, {
      method: 'PUT',
      data,
    }),

  deleteLead: (id: string) =>
    fetchApi<void>(`/v1/leads/${id}`, {
      method: 'DELETE',
    }),
};
