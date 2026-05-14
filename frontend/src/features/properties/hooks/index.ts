import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesApi } from '../api';
import { PropertyFilters, PropertyCreateInput, Property } from '../types';

export const propertiesKeys = {
  all: ['properties'] as const,
  lists: () => [...propertiesKeys.all, 'list'] as const,
  list: (filters: PropertyFilters, page: number) => [...propertiesKeys.lists(), { filters, page }] as const,
  details: () => [...propertiesKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertiesKeys.details(), id] as const,
};

export function usePropertiesQuery(filters: PropertyFilters, page: number = 1) {
  return useQuery({
    queryKey: propertiesKeys.list(filters, page),
    queryFn: () => propertiesApi.getProperties(filters, page),
  });
}

export function usePropertyQuery(id: string) {
  return useQuery({
    queryKey: propertiesKeys.detail(id),
    queryFn: () => propertiesApi.getPropertyById(id),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PropertyCreateInput) => propertiesApi.createProperty(data),
    onMutate: async (newProperty) => {
      await queryClient.cancelQueries({ queryKey: propertiesKeys.lists() });
      const previousQueries = queryClient.getQueriesData({ queryKey: propertiesKeys.lists() });

      queryClient.setQueriesData({ queryKey: propertiesKeys.lists() }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          properties: [{ id: `temp-${Date.now()}`, ...newProperty, status: 'available' }, ...old.properties],
          total: old.total + 1
        };
      });

      return { previousQueries };
    },
    onError: (err, newProperty, context: any) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PropertyCreateInput> }) => propertiesApi.updateProperty(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: propertiesKeys.lists() });
      await queryClient.cancelQueries({ queryKey: propertiesKeys.detail(id) });

      const previousLists = queryClient.getQueriesData({ queryKey: propertiesKeys.lists() });
      
      queryClient.setQueriesData({ queryKey: propertiesKeys.lists() }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          properties: old.properties.map((p: Property) => p.id === id ? { ...p, ...data } : p)
        };
      });

      return { previousLists };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: propertiesKeys.detail(variables.id) });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => propertiesApi.deleteProperty(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: propertiesKeys.lists() });
      const previousLists = queryClient.getQueriesData({ queryKey: propertiesKeys.lists() });

      queryClient.setQueriesData({ queryKey: propertiesKeys.lists() }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          properties: old.properties.filter((p: Property) => p.id !== id),
          total: old.total - 1
        };
      });

      return { previousLists };
    },
    onError: (err, id, context: any) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() });
    },
  });
}
