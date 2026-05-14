export interface DashboardSummary {
  sessions_today: number;
  sessions_this_month: number;
  revenue_this_month: number;
  leads_this_month: number;
  leads_converted: number;
  active_leads: number;
  wallet_balance: number;
  avg_session_cost: number;
  conversion_rate: number;
}

export interface DashboardMetrics {
  total_leads: number;
  leads_change_percent: number;
  active_calls: number;
  booked_visits: number;
  visits_change_percent: number;
  conversion_rate: number;
  conversion_change_percent: number;
  revenue_pipeline: number;
  pipeline_change_percent: number;
}

export interface RecentActivity {
  id: string;
  type: ActivityType;
  target: string;
  detail: string;
  timestamp: string;
  icon: string;
}

export type ActivityType = 
  | 'lead_qualified'
  | 'site_visit_booked'
  | 'call_missed'
  | 'lead_sourced'
  | 'call_completed'
  | 'message_sent';

export interface AIInsight {
  id: string;
  type: 'campaign' | 'recommendation' | 'alert';
  title: string;
  description: string;
  action_label?: string;
  action_url?: string;
}

export interface DashboardAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  action_url?: string;
}

export interface AnalyticsOverview {
  metrics: DashboardMetrics;
  recent_activities: RecentActivity[];
  insights: AIInsight[];
  alerts: DashboardAlert[];
}

export interface SessionStats {
  session_id: string;
  status: 'active' | 'completed' | 'failed' | 'timeout';
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  transcript_length: number;
  cost: number;
}

export interface AnalyticsTimeRange {
  start: string;
  end: string;
  label: 'today' | 'week' | 'month' | 'quarter' | 'year';
}

export interface AnalyticsResponse {
  overview: AnalyticsOverview;
  time_range: AnalyticsTimeRange;
}