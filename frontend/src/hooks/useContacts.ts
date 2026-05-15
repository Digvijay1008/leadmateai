'use client';

import { useState, useCallback, useEffect } from 'react';
import { contactsApi } from '@/services/contacts.api';
import type {
  Contact,
  ContactFilters,
  ContactCreateInput,
  ContactUpdateInput,
} from '@/types/contact';

interface UseContactsOptions {
  initialFilters?: ContactFilters;
  autoFetch?: boolean;
}

interface UseContactsReturn {
  contacts: Contact[];
  total: number;
  loading: boolean;
  error: Error | null;
  filters: ContactFilters;
  page: number;
  pageSize: number;
  refetch: () => Promise<void>;
  setFilters: (filters: ContactFilters) => void;
  setPage: (page: number) => void;
  createContact: (input: ContactCreateInput) => Promise<Contact>;
  updateContact: (id: string, input: ContactUpdateInput) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
}

export function useContacts(options: UseContactsOptions = {}): UseContactsReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState<ContactFilters>(initialFilters);
  const [page, setPageState] = useState(1);
  const [pageSize] = useState(20);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await contactsApi.list(filters, page, pageSize);
      setContacts(response.leads);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch contacts'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (autoFetch) {
      fetchContacts();
    }
  }, [autoFetch, fetchContacts]);

  const createContact = useCallback(async (input: ContactCreateInput): Promise<Contact> => {
    const newContact = await contactsApi.create(input);
    setContacts(prev => [newContact, ...prev]);
    setTotal(prev => prev + 1);
    return newContact;
  }, []);

  const updateContact = useCallback(async (id: string, input: ContactUpdateInput): Promise<Contact> => {
    const updated = await contactsApi.update(id, input);
    setContacts(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  }, []);

  const deleteContact = useCallback(async (id: string): Promise<void> => {
    await contactsApi.delete(id);
    setContacts(prev => prev.filter(c => c.id !== id));
    setTotal(prev => prev - 1);
  }, []);

  const setFilters = useCallback((newFilters: ContactFilters) => {
    setFiltersState(newFilters);
    setPageState(1);
  }, []);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  return {
    contacts,
    total,
    loading,
    error,
    filters,
    page,
    pageSize,
    refetch: fetchContacts,
    setFilters,
    setPage,
    createContact,
    updateContact,
    deleteContact,
  };
}
