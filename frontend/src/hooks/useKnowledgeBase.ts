'use client';

import { useState, useCallback, useEffect } from 'react';
import { knowledgeBaseApi } from '@/services/knowledge-base.api';
import type { KnowledgeDocument, KnowledgeIngestInput, KnowledgeQuery, KnowledgeQueryResult, KnowledgeStats } from '@/types/knowledge';

interface UseKnowledgeBaseOptions {
  autoFetch?: boolean;
}

interface UseKnowledgeBaseReturn {
  documents: KnowledgeDocument[];
  stats: KnowledgeStats | null;
  total: number;
  loading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  query: (query: KnowledgeQuery) => Promise<KnowledgeQueryResult>;
  ingestDocument: (input: KnowledgeIngestInput) => Promise<KnowledgeDocument>;
  deleteDocument: (id: string) => Promise<void>;
}

export function useKnowledgeBase(options: UseKnowledgeBaseOptions = {}): UseKnowledgeBaseReturn {
  const { autoFetch = true } = options;

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await knowledgeBaseApi.list(page, pageSize);
      setDocuments(response.documents);
      setTotal(response.total);

      const statsData = await knowledgeBaseApi.stats();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch knowledge base'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (autoFetch) {
      fetchDocuments();
    }
  }, [autoFetch, fetchDocuments]);

  const queryKnowledge = useCallback(async (query: KnowledgeQuery): Promise<KnowledgeQueryResult> => {
    return knowledgeBaseApi.query(query);
  }, []);

  const ingestDocument = useCallback(async (input: KnowledgeIngestInput): Promise<KnowledgeDocument> => {
    const newDoc = await knowledgeBaseApi.ingest(input);
    setDocuments(prev => [newDoc, ...prev]);
    setTotal(prev => prev + 1);
    return newDoc;
  }, []);

  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    await knowledgeBaseApi.delete(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    setTotal(prev => prev - 1);
  }, []);

  return {
    documents,
    stats,
    total,
    loading,
    error,
    page,
    pageSize,
    refetch: fetchDocuments,
    setPage,
    query: queryKnowledge,
    ingestDocument,
    deleteDocument,
  };
}