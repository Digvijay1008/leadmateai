export interface DashboardSummary {
  leads_this_month: number;
  sessions_today: number;
  leads_converted: number;
  conversion_rate: number;
  wallet_balance: number;
  total_calls: number;
  avg_call_duration: number;
  revenue?: number;
}

export interface AnalyticsKPI {
  label: string;
  value: number;
  change_percent?: number;
  trend: 'up' | 'down' | 'flat';
}

export interface CallStats {
  total_sessions: number;
  completed_sessions: number;
  failed_sessions: number;
  avg_duration: number;
  total_duration: number;
  total_cost: number;
}

export interface AnalyticsFilters {
  period?: '7days' | '30days' | '90days' | 'all';
}
