import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '../api';
import type { ContactFilters, ContactCreateInput, ContactUpdateInput } from '../types';

const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (filters: ContactFilters, page: number) =>
    [...contactKeys.lists(), { filters, page }] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
};

export function useContactsQuery(filters: ContactFilters, page = 1) {
  return useQuery({
    queryKey: contactKeys.list(filters, page),
    queryFn: () => contactsApi.getContacts(filters, page),
  });
}

export function useContactQuery(id: string) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => contactsApi.getContactById(id),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactCreateInput) => contactsApi.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactUpdateInput }) =>
      contactsApi.updateContact(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(variables.id) });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsApi.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
  });
}
