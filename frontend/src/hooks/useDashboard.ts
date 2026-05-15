'use client';

import { useState, useCallback, useEffect } from 'react';
import { analyticsApi } from '@/services/analytics.api';
import type { DashboardSummary, SessionStats } from '@/types/analytics';

interface UseDashboardOptions {
  autoFetch?: boolean;
}

interface UseDashboardReturn {
  summary: DashboardSummary | null;
  sessions: SessionStats[];
  leads: { id: string; name: string; status: string; created_at: string }[];
  revenue: { date: string; amount: number }[];
  loading: boolean;
  error: Error | null;
  timeRange: string;
  refetch: () => Promise<void>;
  setTimeRange: (range: string) => void;
}

export function useDashboard(options: UseDashboardOptions = {}): UseDashboardReturn {
  const { autoFetch = true } = options;

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sessions, setSessions] = useState<SessionStats[]>([]);
  const [leads, setLeads] = useState<{ id: string; name: string; status: string; created_at: string }[]>([]);
  const [revenue, setRevenue] = useState<{ date: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [timeRange, setTimeRange] = useState('30days');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, sessionsData, leadsData, revenueData] = await Promise.all([
        analyticsApi.dashboard(),
        analyticsApi.sessions(timeRange),
        analyticsApi.leads(timeRange),
        analyticsApi.revenue(timeRange),
      ]);

      setSummary(summaryData);
      setSessions(sessionsData.sessions || []);
      setLeads(leadsData.leads || []);
      setRevenue(revenueData.revenue || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  const handleSetTimeRange = useCallback((range: string) => {
    setTimeRange(range);
  }, []);

  return {
    summary,
    sessions,
    leads,
    revenue,
    loading,
    error,
    timeRange,
    refetch: fetchData,
    setTimeRange: handleSetTimeRange,
  };
}
