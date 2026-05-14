import { fetchApi } from '@/lib/api-client';

export interface AdminTenant {
  id: string;
  business_name: string;
  status: string;
  created_at: string;
  wallet_balance: number;
  total_calls: number;
  total_spend: number;
}

export interface SystemHealth {
  status: {
    livekit: string;
    sip: string;
    database: string;
    worker: string;
  };
  metrics: {
    queue_backlog: number;
    active_workers_tasks: number;
    active_livekit_sessions: number;
  };
}

export interface UsageDay {
  date: string;
  calls_per_day: number;
  minutes_used: number;
  success_rate: number;
}

export const adminApi = {
  getTenants: () => fetchApi<{ tenants: AdminTenant[] }>('/v1/admin/tenants'),
  getSystemHealth: () => fetchApi<SystemHealth>('/v1/admin/system'),
  getUsage: () => fetchApi<{ usage: UsageDay[] }>('/v1/admin/usage'),
};
