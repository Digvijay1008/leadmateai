import { fetchApi } from './apiClient';
import type { Property, PropertyCreateInput, PropertyFilters, PropertyListResponse } from '@/types/property';

export const propertiesApi = {
  list: async (filters?: PropertyFilters, page = 1, pageSize = 20): Promise<PropertyListResponse> => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    
    if (filters?.property_type) params.set('property_type', filters.property_type);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.city) params.set('city', filters.city);
    if (filters?.search) params.set('search', filters.search);
    
    return fetchApi<PropertyListResponse>(`/v1/properties?${params.toString()}`);
  },

  get: async (id: string): Promise<Property> => {
    return fetchApi<Property>(`/v1/properties/${id}`);
  },

  create: async (input: PropertyCreateInput): Promise<Property> => {
    return fetchApi<Property>('/v1/properties', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update: async (id: string, input: Partial<PropertyCreateInput>): Promise<Property> => {
    return fetchApi<Property>(`/v1/properties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  delete: async (id: string): Promise<void> => {
    return fetchApi<void>(`/v1/properties/${id}`, {
      method: 'DELETE',
    });
  },
};
