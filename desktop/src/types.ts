export interface Task {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description?: string;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  is_bought: boolean;
  cost: number | null;
  quantity: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  title: string;
  type: "tasks" | "purchases" | "mixed";
  color?: string;
  icon?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserRegister {
  username: string;
  email: string;
  password: string;
}

export interface DashboardStats {
  total_events: number;
  tasks_created: number;
  tasks_completed: number;
  purchases_created: number;
  purchases_completed: number;
  total_spending: number;
  total_created_cost: number;
  total_incomplete_purchases_cost: number;
  overdue_tasks_count: number;
  period: string;
  daily_stats: Array<{
    date: string;
    tasks: number;
    purchases: number;
    spending: number;
  }>;
  tasks_created_by_priority: Record<string, number>;
  tasks_completed_avg_time: number;
  purchases_pending_count: number;
  purchases_completed_avg_time: number;
  spending_by_category: Record<string, number>;
  roi: number;
  forecast_needed: number;
  urgency_breakdown: Record<string, number>;
}

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  payload: any;
  created_at: string;
}

export interface ActivityHeatmap {
  start_date: string;
  end_date: string;
  total_days: number;
  total_activity: number;
  heatmap: Array<{
    date: string;
    activity: number;
  }>;
}

export interface UserSession {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  is_current?: boolean;
}
