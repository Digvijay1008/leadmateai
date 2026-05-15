import { fetchApi } from './apiClient';
import type {
  Contact,
  ContactFilters,
  ContactCreateInput,
  ContactUpdateInput,
  ContactListResponse,
} from '@/types/contact';

export const contactsApi = {
  list: async (
    filters?: ContactFilters,
    page = 1,
    pageSize = 20,
  ): Promise<ContactListResponse> => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));

    if (filters?.status) params.set('status', filters.status);
    if (filters?.source) params.set('source', filters.source);
    if (filters?.search) params.set('search', filters.search);

    return fetchApi<ContactListResponse>(`/v1/contacts?${params.toString()}`);
  },

  get: async (id: string): Promise<Contact> => {
    return fetchApi<Contact>(`/v1/contacts/${id}`);
  },

  create: async (input: ContactCreateInput): Promise<Contact> => {
    return fetchApi<Contact>('/v1/contacts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update: async (id: string, input: ContactUpdateInput): Promise<Contact> => {
    return fetchApi<Contact>(`/v1/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  delete: async (id: string): Promise<void> => {
    return fetchApi<void>(`/v1/contacts/${id}`, {
      method: 'DELETE',
    });
  },
};
