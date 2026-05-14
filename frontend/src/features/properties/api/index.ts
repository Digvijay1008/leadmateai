import { fetchApi } from '@/lib/api-client';
import { Property, PropertyFilters, PropertyCreateInput, PropertyListResponse } from '../types';

export const propertiesApi = {
  getProperties: (filters?: PropertyFilters, page = 1, pageSize = 20) => {
    const params = new URLSearchParams();
    if (filters?.property_type) params.append('property_type', filters.property_type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.city) params.append('city', filters.city);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.min_price !== undefined) params.append('min_price', filters.min_price.toString());
    if (filters?.max_price !== undefined) params.append('max_price', filters.max_price.toString());
    params.append('limit', pageSize.toString());
    params.append('offset', ((page - 1) * pageSize).toString());

    return fetchApi<PropertyListResponse>(`/v1/properties?${params.toString()}`);
  },

  getPropertyById: (id: string) => fetchApi<Property>(`/v1/properties/${id}`),

  createProperty: (data: PropertyCreateInput) =>
    fetchApi<Property>('/v1/properties', {
      method: 'POST',
      data,
    }),

  updateProperty: (id: string, data: Partial<PropertyCreateInput>) =>
    fetchApi<Property>(`/v1/properties/${id}`, {
      method: 'PUT',
      data,
    }),

  deleteProperty: (id: string) =>
    fetchApi<void>(`/v1/properties/${id}`, {
      method: 'DELETE',
    }),
};
