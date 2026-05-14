'use client';

import { useState, useCallback, useEffect } from 'react';
import { propertiesApi } from '@/services/properties.api';
import type { Property, PropertyFilters, PropertyCreateInput } from '@/types/property';

interface UsePropertiesOptions {
  initialFilters?: PropertyFilters;
  autoFetch?: boolean;
}

interface UsePropertiesReturn {
  properties: Property[];
  total: number;
  loading: boolean;
  error: Error | null;
  filters: PropertyFilters;
  page: number;
  pageSize: number;
  refetch: () => Promise<void>;
  setFilters: (filters: PropertyFilters) => void;
  setPage: (page: number) => void;
  createProperty: (input: PropertyCreateInput) => Promise<Property>;
  updateProperty: (id: string, input: Partial<PropertyCreateInput>) => Promise<Property>;
  deleteProperty: (id: string) => Promise<void>;
}

export function useProperties(options: UsePropertiesOptions = {}): UsePropertiesReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await propertiesApi.list(filters, page, pageSize);
      setProperties(response.properties);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch properties'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (autoFetch) {
      fetchProperties();
    }
  }, [autoFetch, fetchProperties]);

  const createProperty = useCallback(async (input: PropertyCreateInput): Promise<Property> => {
    const newProperty = await propertiesApi.create(input);
    setProperties(prev => [newProperty, ...prev]);
    setTotal(prev => prev + 1);
    return newProperty;
  }, []);

  const updateProperty = useCallback(async (id: string, input: Partial<PropertyCreateInput>): Promise<Property> => {
    const updatedProperty = await propertiesApi.update(id, input);
    setProperties(prev => prev.map(p => p.id === id ? updatedProperty : p));
    return updatedProperty;
  }, []);

  const deleteProperty = useCallback(async (id: string): Promise<void> => {
    await propertiesApi.delete(id);
    setProperties(prev => prev.filter(p => p.id !== id));
    setTotal(prev => prev - 1);
  }, []);

  const handleSetFilters = useCallback((newFilters: PropertyFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    properties,
    total,
    loading,
    error,
    filters,
    page,
    pageSize,
    refetch: fetchProperties,
    setFilters: handleSetFilters,
    setPage: handleSetPage,
    createProperty,
    updateProperty,
    deleteProperty,
  };
}