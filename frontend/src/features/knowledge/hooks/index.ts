import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '../api';
import { KnowledgeIngestInput, KnowledgeQuery } from '../types';
import { useToast } from '@/components/ui/toast-provider';

export const knowledgeKeys = {
  all: ['knowledge'] as const,
  lists: () => [...knowledgeKeys.all, 'list'] as const,
  list: (page: number) => [...knowledgeKeys.lists(), { page }] as const,
  stats: () => [...knowledgeKeys.all, 'stats'] as const,
};

export function useKnowledgeDocumentsQuery(page = 1) {
  return useQuery({
    queryKey: knowledgeKeys.list(page),
    queryFn: () => knowledgeApi.getDocuments(page, 20),
    staleTime: 5 * 60 * 1000, // 5 minutes — KB changes infrequently
  });
}

export function useKnowledgeStatsQuery() {
  return useQuery({
    queryKey: knowledgeKeys.stats(),
    queryFn: () => knowledgeApi.getStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useIngestKnowledge() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (data: KnowledgeIngestInput) => knowledgeApi.ingestDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.stats() });
      addToast('Document uploaded successfully', 'success');
    },
    onError: (err: Error) => {
      addToast(err.message || 'Failed to upload document', 'error');
    },
  });
}

export function useDeleteKnowledge() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => knowledgeApi.deleteDocument(id),
    // Optimistic update: remove immediately from all list caches
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: knowledgeKeys.lists() });
      const previousLists = queryClient.getQueriesData({ queryKey: knowledgeKeys.lists() });

      queryClient.setQueriesData({ queryKey: knowledgeKeys.lists() }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          documents: old.documents.filter((d: any) => d.id !== id),
          total: Math.max(0, old.total - 1),
        };
      });

      return { previousLists };
    },
    onError: (err: Error, _id, context: any) => {
      // Roll back optimistic update
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      addToast(err.message || 'Failed to delete document', 'error');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.stats() });
      addToast('Document deleted', 'default');
    },
  });
}

export function useQueryKnowledge() {
  return useMutation({
    mutationFn: (query: KnowledgeQuery) => knowledgeApi.queryKnowledge(query),
  });
}
