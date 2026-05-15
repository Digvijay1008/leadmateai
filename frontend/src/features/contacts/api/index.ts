import { fetchApi } from '@/lib/api-client';
import type {
  Contact,
  ContactFilters,
  ContactCreateInput,
  ContactUpdateInput,
} from '../types';

export const contactsApi = {
  getContacts: (filters?: ContactFilters, page = 1, pageSize = 20) => {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.search) params.append('search', filters.search);
    params.append('limit', pageSize.toString());
    params.append('offset', ((page - 1) * pageSize).toString());

    return fetchApi<{ leads: Contact[]; total: number }>(
      `/v1/contacts?${params.toString()}`,
    );
  },

  getContactById: (id: string) => {
    return fetchApi<Contact>(`/v1/contacts/${id}`);
  },

  createContact: (data: ContactCreateInput) => {
    return fetchApi<Contact>('/v1/contacts', {
      method: 'POST',
      data,
    });
  },

  updateContact: (id: string, data: ContactUpdateInput) => {
    return fetchApi<Contact>(`/v1/contacts/${id}`, {
      method: 'PUT',
      data,
    });
  },

  deleteContact: (id: string) => {
    return fetchApi<void>(`/v1/contacts/${id}`, {
      method: 'DELETE',
    });
  },
};
