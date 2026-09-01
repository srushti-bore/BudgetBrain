import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  APIEnvelope,
  Category,
  Expense,
  Budget,
  DashboardSummary,
  CategorySpend,
  SpendTrendItem,
  MonthComparison,
  TopCategory,
  User,
  TokenResponse,
  MessageResponse,
} from '@/types';

const getApiBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || '';
  if (!url) {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
      url = 'https://budgetbrain-ojnr.onrender.com/api/v1';
    } else {
      url = 'http://localhost:8000/api/v1';
    }
  }
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
};

export const API_BASE_URL = getApiBaseUrl();

// ── In-Memory Token Store ──────────────────────────────────────────────────
let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('budgetbrain_session_active', '1');
    } else {
      sessionStorage.removeItem('budgetbrain_session_active');
    }
  }
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

// ── Axios Client ───────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10s request timeout to prevent hanging when backend is sleeping
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send HttpOnly refresh token cookie on every request
});


// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto Refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 from a regular protected endpoint and not already retrying
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<APIEnvelope<TokenResponse>>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = response.data.data.access_token;
        setAccessToken(newToken);
        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        setAccessToken(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth API ───────────────────────────────────────────────────────────────
export const authApi = {
  register: async (data: { email: string; password: string; full_name?: string }): Promise<TokenResponse> => {
    const response = await apiClient.post<APIEnvelope<TokenResponse>>('/auth/register', data);
    setAccessToken(response.data.data.access_token);
    return response.data.data;
  },
  login: async (data: { email: string; password: string }): Promise<TokenResponse> => {
    const response = await apiClient.post<APIEnvelope<TokenResponse>>('/auth/login', data);
    setAccessToken(response.data.data.access_token);
    return response.data.data;
  },
  googleLogin: async (idToken: string): Promise<TokenResponse> => {
    const response = await apiClient.post<APIEnvelope<TokenResponse>>('/auth/google', { id_token: idToken });
    setAccessToken(response.data.data.access_token);
    return response.data.data;
  },
  refresh: async (): Promise<TokenResponse> => {
    const response = await apiClient.post<APIEnvelope<TokenResponse>>('/auth/refresh');
    setAccessToken(response.data.data.access_token);
    return response.data.data;
  },
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<APIEnvelope<User>>('/auth/me');
    return response.data.data;
  },
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },
  logoutAll: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout-all');
    } finally {
      setAccessToken(null);
    }
  },
  changePassword: async (data: { current_password: string; new_password: string }): Promise<MessageResponse> => {
    const response = await apiClient.post<APIEnvelope<MessageResponse>>('/auth/change-password', data);
    return response.data.data;
  },
  forgotPassword: async (email: string): Promise<MessageResponse> => {
    const response = await apiClient.post<APIEnvelope<MessageResponse>>('/auth/forgot-password', { email });
    return response.data.data;
  },
};

// ── Category API ───────────────────────────────────────────────────────────
export const categoryApi = {
  list: async (): Promise<Category[]> => {
    const response = await apiClient.get<APIEnvelope<Category[]>>('/categories');
    return response.data.data;
  },
  create: async (data: { name: string }): Promise<Category> => {
    const response = await apiClient.post<APIEnvelope<Category>>('/categories', data);
    return response.data.data;
  },
  update: async (id: string, data: { name: string }): Promise<Category> => {
    const response = await apiClient.patch<APIEnvelope<Category>>(`/categories/${id}`, data);
    return response.data.data;
  },
  delete: async (id: string, force: boolean = false): Promise<void> => {
    await apiClient.delete(`/categories/${id}`, { params: { force } });
  },
};

// ── Expense API ────────────────────────────────────────────────────────────
export interface ExpenseQueryParams {
  search?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  payment_mode?: string;
  is_recurring?: boolean;
  sort_by?: 'amount' | 'date' | 'category';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export const expenseApi = {
  list: async (params?: ExpenseQueryParams): Promise<APIEnvelope<Expense[]>> => {
    const backendParams: any = { ...params };
    if (params) {
      if (params.start_date !== undefined) {
        backendParams.date_from = params.start_date;
        delete backendParams.start_date;
      }
      if (params.end_date !== undefined) {
        backendParams.date_to = params.end_date;
        delete backendParams.end_date;
      }
      if (params.min_amount !== undefined) {
        backendParams.amount_min = params.min_amount;
        delete backendParams.min_amount;
      }
      if (params.max_amount !== undefined) {
        backendParams.amount_max = params.max_amount;
        delete backendParams.max_amount;
      }
    }
    const response = await apiClient.get<APIEnvelope<Expense[]>>('/expenses', { params: backendParams });
    return response.data;
  },
  getById: async (id: string): Promise<Expense> => {
    const response = await apiClient.get<APIEnvelope<Expense>>(`/expenses/${id}`);
    return response.data.data;
  },
  create: async (data: {
    title: string;
    amount: number;
    category_id: string;
    date: string;
    notes?: string | null;
    payment_mode?: string | null;
    is_recurring?: boolean;
  }): Promise<Expense> => {
    const response = await apiClient.post<APIEnvelope<Expense>>('/expenses', data);
    return response.data.data;
  },
  update: async (
    id: string,
    data: {
      title?: string;
      amount?: number;
      category_id?: string;
      date?: string;
      notes?: string | null;
      payment_mode?: string | null;
      is_recurring?: boolean;
    }
  ): Promise<Expense> => {
    const response = await apiClient.patch<APIEnvelope<Expense>>(`/expenses/${id}`, data);
    return response.data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },
};

// ── Budget API ─────────────────────────────────────────────────────────────
export const budgetApi = {
  list: async (period_start?: string): Promise<Budget[]> => {
    const response = await apiClient.get<APIEnvelope<Budget[]>>('/budgets', {
      params: period_start ? { period_start } : undefined,
    });
    return response.data.data;
  },
  create: async (data: {
    category_id?: string | null;
    period_type?: string;
    period_start: string;
    limit_amount: number;
    daily_limit?: number | null;
  }): Promise<Budget> => {
    const response = await apiClient.post<APIEnvelope<Budget>>('/budgets', data);
    return response.data.data;
  },
  update: async (
    id: string,
    data: { limit_amount?: number; daily_limit?: number | null }
  ): Promise<Budget> => {
    const response = await apiClient.patch<APIEnvelope<Budget>>(`/budgets/${id}`, data);
    return response.data.data;
  },
};

// ── Dashboard API ──────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<APIEnvelope<any>>('/dashboard/summary');
    const data = response.data.data;
    return {
      period_start: data.period_start,
      period_end: data.period_end,
      total_spent: Number(data.total_spent),
      expense_count: data.expense_count,
      budget_limit: data.budget ? Number(data.budget.limit_amount) : null,
      budget_remaining: data.budget ? Number(data.budget.remaining_amount) : null,
      budget_status: data.budget ? data.budget.status : null,
      daily_limit: data.budget ? data.budget.daily_limit : null,
      today_spent: data.today_spent ? Number(data.today_spent) : 0,
      avg_daily_spend: data.average_daily_spent ? Number(data.average_daily_spent) : 0,
      recent_expenses: data.recent_expenses.map((e: any) => ({
        id: e.id,
        title: e.title,
        amount: Number(e.amount),
        category_id: e.category_id,
        category_name: e.category_name,
        date: e.date,
        notes: e.notes,
        payment_mode: e.payment_mode,
        is_recurring: e.is_recurring,
        created_at: e.created_at,
        updated_at: e.updated_at,
      })),
    };
  },
  getByCategory: async (date_from?: string, date_to?: string): Promise<CategorySpend[]> => {
    const response = await apiClient.get<APIEnvelope<any[]>>('/dashboard/by-category', {
      params: { date_from, date_to },
    });
    const items = response.data.data;
    const total = items.reduce((acc: number, item: any) => acc + Number(item.total), 0);
    return items.map((item: any) => ({
      category_id: item.category_id,
      category_name: item.category_name,
      total_spent: Number(item.total),
      percentage: total > 0 ? (Number(item.total) / total) * 100 : 0,
    }));
  },
  getTrend: async (
    group_by: 'day' | 'week' | 'month' = 'day',
    date_from?: string,
    date_to?: string
  ): Promise<SpendTrendItem[]> => {
    const response = await apiClient.get<APIEnvelope<any[]>>('/dashboard/trend', {
      params: { group_by, date_from, date_to },
    });
    return response.data.data.map((item: any) => ({
      date_period: item.period,
      total_spent: Number(item.total),
    }));
  },
  getComparison: async (): Promise<MonthComparison> => {
    const response = await apiClient.get<APIEnvelope<any>>('/dashboard/comparison');
    const data = response.data.data;
    return {
      current_month_total: Number(data.current_month_total ?? data.current_month_spent ?? 0),
      current_month_spent: Number(data.current_month_total ?? data.current_month_spent ?? 0),
      previous_month_total: Number(data.previous_month_total ?? data.previous_month_spent ?? 0),
      previous_month_spent: Number(data.previous_month_total ?? data.previous_month_spent ?? 0),
      difference: Number(data.difference ?? 0),
      percentage_change: data.percentage_change !== null ? Number(data.percentage_change) : null,
      is_increase: data.is_increase ?? (Number(data.difference ?? 0) > 0),
    };
  },
  getTopCategories: async (limit: number = 5): Promise<TopCategory[]> => {
    const response = await apiClient.get<APIEnvelope<any[]>>('/dashboard/top-categories', {
      params: { limit },
    });
    return response.data.data.map((item: any) => ({
      category_id: item.category_id,
      category_name: item.category_name,
      total_spent: Number(item.total),
    }));
  },
};
