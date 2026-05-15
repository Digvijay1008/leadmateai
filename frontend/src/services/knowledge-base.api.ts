import { fetchApi } from './apiClient';
import type { 
  KnowledgeDocument, 
  KnowledgeIngestInput, 
  KnowledgeQuery, 
  KnowledgeQueryResult,
  KnowledgeStats 
} from '@/types/knowledge';

export const knowledgeBaseApi = {
  list: async (page = 1, pageSize = 20): Promise<{ documents: KnowledgeDocument[]; total: number }> => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return fetchApi<{ documents: KnowledgeDocument[]; total: number }>(`/v1/knowledge-base?${params.toString()}`);
  },

  get: async (id: string): Promise<KnowledgeDocument> => {
    return fetchApi<KnowledgeDocument>(`/v1/knowledge-base/${id}`);
  },

  stats: async (): Promise<KnowledgeStats> => {
    return fetchApi<KnowledgeStats>('/v1/knowledge-base/stats');
  },

  query: async (query: KnowledgeQuery): Promise<KnowledgeQueryResult> => {
    return fetchApi<KnowledgeQueryResult>('/v1/rag/query-formatted', {
      method: 'POST',
      body: JSON.stringify(query),
    });
  },

  ingest: async (input: KnowledgeIngestInput): Promise<KnowledgeDocument> => {
    return fetchApi<KnowledgeDocument>('/v1/knowledge-base/text', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  delete: async (id: string): Promise<void> => {
    return fetchApi<void>(`/v1/knowledge-base/${id}`, {
      method: 'DELETE',
    });
  },
};
