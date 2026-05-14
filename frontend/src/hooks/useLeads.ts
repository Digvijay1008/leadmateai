'use client';

import { useState, useCallback, useEffect } from 'react';
import { leadsApi } from '@/services/leads.api';
import type { Lead, LeadFilters, LeadCreateInput, LeadUpdateInput } from '@/types/lead';

interface UseLeadsOptions {
  initialFilters?: LeadFilters;
  autoFetch?: boolean;
}

interface UseLeadsReturn {
  leads: Lead[];
  total: number;
  loading: boolean;
  error: Error | null;
  filters: LeadFilters;
  page: number;
  pageSize: number;
  refetch: () => Promise<void>;
  setFilters: (filters: LeadFilters) => void;
  setPage: (page: number) => void;
  createLead: (input: LeadCreateInput) => Promise<Lead>;
  updateLead: (id: string, input: LeadUpdateInput) => Promise<Lead>;
  deleteLead: (id: string) => Promise<void>;
}

export function useLeads(options: UseLeadsOptions = {}): UseLeadsReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leadsApi.list(filters, page, pageSize);
      setLeads(response.leads);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch leads'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (autoFetch) {
      fetchLeads();
    }
  }, [autoFetch, fetchLeads]);

  const createLead = useCallback(async (input: LeadCreateInput): Promise<Lead> => {
    const newLead = await leadsApi.create(input);
    setLeads(prev => [newLead, ...prev]);
    setTotal(prev => prev + 1);
    return newLead;
  }, []);

  const updateLead = useCallback(async (id: string, input: LeadUpdateInput): Promise<Lead> => {
    const updatedLead = await leadsApi.update(id, input);
    setLeads(prev => prev.map(l => l.id === id ? updatedLead : l));
    return updatedLead;
  }, []);

  const deleteLead = useCallback(async (id: string): Promise<void> => {
    await leadsApi.delete(id);
    setLeads(prev => prev.filter(l => l.id !== id));
    setTotal(prev => prev - 1);
  }, []);

  const handleSetFilters = useCallback((newFilters: LeadFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    leads,
    total,
    loading,
    error,
    filters,
    page,
    pageSize,
    refetch: fetchLeads,
    setFilters: handleSetFilters,
    setPage: handleSetPage,
    createLead,
    updateLead,
    deleteLead,
  };
}