'use client';
import { fetchApi } from './apiClient';

export const leadsService = {
  getLeads: () => fetchApi<any[]>('/v1/leads'),
  getLead: (id: string) => fetchApi<any>(`/v1/leads/${id}`),
};

export const propertiesService = {
  getProperties: () => fetchApi<any[]>('/v1/properties'),
};

export const knowledgeBaseService = {
  getDocuments: () => fetchApi<any[]>('/v1/rag/documents'),
};
