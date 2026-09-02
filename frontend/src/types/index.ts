export interface Category {
  id: string;
  name: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  expense_count?: number;
}

export type PaymentMode = 'cash' | 'card' | 'upi' | 'other';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category_id: string;
  category_name?: string;
  date: string;
  notes?: string | null;
  payment_mode?: PaymentMode | null;
  is_recurring?: boolean;
  created_at: string;
  updated_at: string;
}

export type BudgetStatus = 'on_track' | 'near_limit' | 'over_budget';

export interface Budget {
  id: string;
  category_id: string | null;
  category_name?: string | null;
  period_type: 'monthly' | 'weekly';
  period_start: string;
  limit_amount: number;
  daily_limit?: number | null;
  spent_amount?: number;
  remaining_amount?: number;
  status?: BudgetStatus;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  period_start: string;
  period_end: string;
  total_spent: number;
  expense_count: number;
  budget_limit: number | null;
  budget_remaining: number | null;
  budget_status: BudgetStatus | null;
  recent_expenses: Expense[];
  avg_daily_spend?: number;
  avg_weekly_spend?: number;
  today_spent?: number;
  daily_limit?: number | null;
}

export interface CategorySpend {
  category_id: string;
  category_name: string;
  total_spent: number;
  percentage: number;
}

export interface SpendTrendItem {
  date_period: string;
  total_spent: number;
}

export interface MonthComparison {
  current_month_total?: number;
  current_month_spent?: number;
  previous_month_total?: number;
  previous_month_spent?: number;
  difference?: number;
  percentage_change: number | null;
  is_increase?: boolean;
}

export interface TopCategory {
  category_id: string;
  category_name: string;
  total_spent: number;
}

export interface APIMeta {
  page?: number;
  page_size?: number;
  total?: number;
}

export interface APIEnvelope<T> {
  data: T;
  meta?: APIMeta;
}

export interface APIErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export interface APIErrorResponse {
  error: APIErrorDetail;
}

export interface APIError {
  error: APIErrorDetail;
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
  requires_verification?: boolean;
}

export interface MessageResponse {
  message: string;
  success?: boolean;
}
