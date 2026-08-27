import axios from 'axios';
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
} from '@/types';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return 'https://budgetbrain-ojnr.onrender.com/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Category API
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

// Expense API
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
    const response = await apiClient.get<APIEnvelope<Expense[]>>('/expenses', { params });
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
    data: Partial<{
      title: string;
      amount: number;
      category_id: string;
      date: string;
      notes: string | null;
      payment_mode: string | null;
      is_recurring: boolean;
    }>
  ): Promise<Expense> => {
    const response = await apiClient.patch<APIEnvelope<Expense>>(`/expenses/${id}`, data);
    return response.data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },
};

// Budget API
export const budgetApi = {
  list: async (): Promise<Budget[]> => {
    const response = await apiClient.get<APIEnvelope<Budget[]>>('/budgets');
    return response.data.data;
  },
  createOrUpdate: async (data: {
    category_id?: string | null;
    limit_amount: number;
    period_type?: 'monthly' | 'weekly';
    period_start?: string;
  }): Promise<Budget> => {
    const today = new Date();
    const defaultStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const payload = {
      category_id: data.category_id ?? null,
      limit_amount: data.limit_amount,
      period_type: data.period_type || 'monthly',
      period_start: data.period_start || defaultStart,
    };
    const response = await apiClient.post<APIEnvelope<Budget>>('/budgets', payload);
    return response.data.data;
  },
  update: async (id: string, data: { limit_amount: number }): Promise<Budget> => {
    const response = await apiClient.patch<APIEnvelope<Budget>>(`/budgets/${id}`, data);
    return response.data.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  },
  getByCategory: async (dateFrom?: string, dateTo?: string): Promise<CategorySpend[]> => {
    const response = await apiClient.get<CategorySpend[]>('/dashboard/by-category', {
      params: { date_from: dateFrom, date_to: dateTo },
    });
    return response.data;
  },
  getTrend: async (groupBy: 'day' | 'week' | 'month' = 'day'): Promise<SpendTrendItem[]> => {
    const response = await apiClient.get<SpendTrendItem[]>('/dashboard/trend', {
      params: { group_by: groupBy },
    });
    return response.data;
  },
  getComparison: async (): Promise<MonthComparison> => {
    const response = await apiClient.get<MonthComparison>('/dashboard/comparison');
    return response.data;
  },
  getTopCategories: async (limit: number = 5): Promise<TopCategory[]> => {
    const response = await apiClient.get<TopCategory[]>('/dashboard/top-categories', {
      params: { limit },
    });
    return response.data;
  },
};
