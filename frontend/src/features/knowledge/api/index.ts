import { fetchApi } from '@/lib/api-client';
import { KnowledgeDocument, KnowledgeIngestInput, KnowledgeQuery, KnowledgeQueryResult, KnowledgeStats } from '../types';

export const knowledgeApi = {
  getDocuments: (page = 1, pageSize = 20) => {
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    return fetchApi<{ documents: KnowledgeDocument[]; total: number }>(`/v1/knowledge-base?limit=${limit}&offset=${offset}`);
  },

  getStats: () => fetchApi<KnowledgeStats>('/v1/knowledge-base/stats'),

  queryKnowledge: (query: KnowledgeQuery) =>
    fetchApi<KnowledgeQueryResult>('/v1/rag/query-formatted', {
      method: 'POST',
      data: query,
    }),

  ingestDocument: (data: KnowledgeIngestInput) =>
    fetchApi<KnowledgeDocument>('/v1/knowledge-base/text', {
      method: 'POST',
      data,
    }),

  deleteDocument: (id: string) =>
    fetchApi<void>(`/v1/knowledge-base/${id}`, {
      method: 'DELETE',
    }),
};