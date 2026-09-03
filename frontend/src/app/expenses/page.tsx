'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi, categoryApi, ExpenseQueryParams } from '@/lib/api';
import { Expense, Category, ExpenseMood } from '@/types';
import { formatDate } from '@/lib/utils';
import { useFormatCurrency, useCurrency } from '@/providers/CurrencyProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { motion, AnimatePresence } from 'framer-motion';
import ExpenseModal from '@/components/expenses/ExpenseModal';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Receipt,
  RotateCcw,
  Repeat,
  Flame,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';

function ExpensesContent() {
  const searchParams = useSearchParams();
  const formatCurrency = useFormatCurrency();
  const { currency, convertToBase } = useCurrency();
  const queryClient = useQueryClient();

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [moodFilter, setMoodFilter] = useState<ExpenseMood | ''>('');
  const [isRecurringFilter, setIsRecurringFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'amount' | 'date' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Auto-open modal if navigated with ?action=new or ?action=add
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'add') {
      setEditingExpense(null);
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const { nearLimitThreshold = 80 } = useSettings();

  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  });

  // Query params setup
  const queryParams: ExpenseQueryParams = {
    search: search.trim() || undefined,
    category_id: categoryId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    min_amount: minAmount ? convertToBase(parseFloat(minAmount)) : undefined,
    max_amount: maxAmount ? convertToBase(parseFloat(maxAmount)) : undefined,
    payment_mode: paymentMode || undefined,
    mood: moodFilter || undefined,
    is_recurring: isRecurringFilter === 'true' ? true : isRecurringFilter === 'false' ? false : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: pageSize,
  };

  // Fetch expenses with active params
  const { data: response, isLoading } = useQuery({
    queryKey: ['expenses', queryParams],
    queryFn: () => expenseApi.list(queryParams),
  });

  const expenses = response?.data || [];
  const meta = response?.meta || { page: 1, page_size: pageSize, total: 0 };
  const totalPages = Math.max(Math.ceil((meta.total || 0) / pageSize), 1);

  // Mutations
  const createMutation = useMutation({
    mutationFn: expenseApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['categorySpend'] });
      queryClient.invalidateQueries({ queryKey: ['spendTrend'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => expenseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['categorySpend'] });
      queryClient.invalidateQueries({ queryKey: ['spendTrend'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: expenseApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['categorySpend'] });
      queryClient.invalidateQueries({ queryKey: ['spendTrend'] });
    },
  });

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (formData: any) => {
    if (editingExpense) {
      await updateMutation.mutateAsync({ id: editingExpense.id, data: formData });
      showToast('Expense updated successfully!');
    } else {
      await createMutation.mutateAsync(formData);
      showToast('Expense logged successfully!');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(deletingExpense.id);
      showToast('Expense deleted successfully!', 'success');
      setDeletingExpense(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || 'Failed to delete expense', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setPaymentMode('');
    setMoodFilter('');
    setIsRecurringFilter('all');
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      {/* Toast Notification (Center Top) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold border backdrop-blur-md transition-all ${
              toastMessage.type === 'success'
                ? 'bg-sage-light text-sage border-sage/40 dark:bg-sage/20 dark:text-sage shadow-sage/10'
                : toastMessage.type === 'warning'
                ? 'bg-honey-light text-honey border-honey/40 dark:bg-honey/20 dark:text-honey shadow-honey/10'
                : 'bg-coral-light text-coral border-coral/40 dark:bg-coral/20 dark:text-coral shadow-coral/10'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Flame className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Expense Management
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-0.5">
            View, search, filter, and log all your transactions
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-[#2D5A45] text-white font-semibold text-xs md:text-sm rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Glassmorphic Search & Multi-Filter Bar */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Text Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by title or notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/10 dark:border-white/10 text-xs text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-sage transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/10 dark:border-white/10 text-xs text-ink focus:outline-none focus:border-sage transition-all"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Payment Mode */}
          <select
            value={paymentMode}
            onChange={(e) => {
              setPaymentMode(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/10 dark:border-white/10 text-xs text-ink focus:outline-none focus:border-sage transition-all capitalize"
          >
            <option value="">All Payment Modes</option>
            {['upi', 'card', 'cash', 'other'].map((mode) => (
              <option key={mode} value={mode}>
                {mode.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Mood Filter */}
          <select
            value={moodFilter}
            onChange={(e) => {
              setMoodFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/10 dark:border-white/10 text-xs text-ink focus:outline-none focus:border-sage transition-all"
          >
            <option value="">All Moods</option>
            <option value="happy">😊 Happy</option>
            <option value="normal">😐 Normal</option>
            <option value="sad">😔 Sad</option>
            <option value="stressed">😰 Stressed</option>
            <option value="excited">🤩 Excited</option>
          </select>

          {/* Sort By Controls */}
          <div className="flex items-center gap-1 bg-white/70 dark:bg-white/5 border border-ink/10 dark:border-white/10 rounded-xl p-1">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-ink focus:outline-none px-2"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="category">Sort by Category</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded-lg hover:bg-ink/5 dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors"
              title={`Toggle sort order (${sortOrder.toUpperCase()})`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Secondary Filter Row: Dates & Amount Bounds */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-ink/5 dark:border-white/10 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/70 dark:bg-white/5 border border-ink/10 text-xs text-ink"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/70 dark:bg-white/5 border border-ink/10 text-xs text-ink"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted font-medium">Min {currency}:</span>
            <input
              type="number"
              placeholder="0"
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                setPage(1);
              }}
              className="w-20 px-2 py-1.5 rounded-lg bg-white/70 dark:bg-white/5 border border-ink/10 text-xs text-ink"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted font-medium">Max {currency}:</span>
            <input
              type="number"
              placeholder="Max"
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value);
                setPage(1);
              }}
              className="w-20 px-2 py-1.5 rounded-lg bg-white/70 dark:bg-white/5 border border-ink/10 text-xs text-ink"
            />
          </div>

          <button
            onClick={handleResetFilters}
            className="ml-auto px-3 py-1.5 rounded-lg border border-ink/15 dark:border-white/15 text-ink hover:bg-white/60 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sage" /> Reset Filters
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-ink-muted">
            <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-10 h-10 text-ink/20 mx-auto mb-3" />
            <h3 className="font-display font-bold text-base text-ink mb-1">No Expenses Found</h3>
            <p className="text-xs text-ink-muted mb-4">
              No transactions match your current search or filter criteria.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-sage hover:bg-[#2D5A45] text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
            >
              Log New Expense
            </button>
          </div>
        ) : (
          <div>
            {/* Mobile View: Clean Touch-Friendly Cards */}
            <div className="md:hidden divide-y divide-ink/5 dark:divide-white/5">
              <AnimatePresence mode="popLayout">
                {expenses.map((expense) => (
                  <motion.div
                    key={expense.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-2.5 hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-ink text-sm flex items-center gap-1.5">
                            {expense.mood === 'happy' && <span title="Happy">😊</span>}
                            {expense.mood === 'normal' && <span title="Normal">😐</span>}
                            {expense.mood === 'sad' && <span title="Sad">😔</span>}
                            {expense.mood === 'stressed' && <span title="Stressed">😰</span>}
                            {expense.mood === 'excited' && <span title="Excited">🤩</span>}
                            {expense.title}
                          </span>
                          {expense.is_recurring && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-sage-light text-sage text-[10px] font-extrabold border border-sage/30">
                              <Repeat className="w-3 h-3" /> Recurring
                            </span>
                          )}
                        </div>
                        {expense.notes && (
                          <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2">{expense.notes}</p>
                        )}
                      </div>
                      <span className="font-display font-extrabold text-base text-coral shrink-0">
                        -{formatCurrency(expense.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-ink/5 dark:border-white/5 text-xs text-ink-muted">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-sage-light text-ink border border-sage/30 text-[10px] font-semibold">
                          {expense.category_name || 'Uncategorized'}
                        </span>
                        <span>{formatDate(expense.date)}</span>
                        {expense.payment_mode && (
                          <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-ink/10 dark:bg-white/10 text-ink">
                            {expense.payment_mode}
                          </span>
                        )}
                      </div>

                      {/* Mobile Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(expense)}
                          className="p-1.5 rounded-lg bg-sage/10 text-sage hover:bg-sage/20 transition-colors"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingExpense(expense)}
                          className="p-1.5 rounded-lg bg-coral/10 text-coral hover:bg-coral/20 transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Desktop View: Full Data Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-ink/5 dark:bg-white/5 text-ink-muted font-semibold border-b border-ink/5 dark:border-white/10">
                    <th className="py-3 px-4">Title & Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5 dark:divide-white/5 relative">
                  <AnimatePresence mode="popLayout">
                  {expenses.map((expense) => (
                    <motion.tr
                      key={expense.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {expense.mood && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/20"
                              title={`Logged with mood: ${expense.mood}`}
                            >
                              <span>
                                {expense.mood === 'happy' && '😊'}
                                {expense.mood === 'normal' && '😐'}
                                {expense.mood === 'sad' && '😔'}
                                {expense.mood === 'stressed' && '😰'}
                                {expense.mood === 'excited' && '🤩'}
                              </span>
                              <span className="capitalize">{expense.mood}</span>
                            </span>
                          )}
                          <span className="font-bold text-sm text-ink">{expense.title}</span>
                          {expense.is_recurring && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-sage-light text-sage text-[10px] font-extrabold border border-sage/30">
                              <Repeat className="w-3 h-3" /> Recurring
                            </span>
                          )}
                        </div>
                        {expense.notes && (
                          <span className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">{expense.notes}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-sage-light text-ink border border-sage/30 text-[11px] font-semibold">
                          {expense.category_name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-ink-muted font-medium">
                        {formatDate(expense.date)}
                      </td>
                      <td className="py-3 px-4">
                        {expense.payment_mode ? (
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-ink/10 dark:bg-white/10 text-ink">
                            {expense.payment_mode}
                          </span>
                        ) : (
                          <span className="text-ink-muted/50">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-display font-extrabold text-sm text-coral">
                          -{formatCurrency(expense.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(expense)}
                            className="p-1.5 rounded-lg hover:bg-sage/20 text-sage font-bold transition-colors"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingExpense(expense)}
                            className="p-1.5 rounded-lg hover:bg-coral/20 text-coral font-bold transition-colors cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        {(meta.total ?? 0) > 0 && (
          <div className="px-6 py-4 border-t border-ink/5 dark:border-white/10 flex items-center justify-between text-xs text-ink-muted">
            <span>
              Showing {expenses.length} of {meta.total} transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-ink/10 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 text-ink disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-ink">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-ink/10 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 text-ink disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveExpense}
        initialData={editingExpense}
        categories={categories}
        onCategoryCreated={(newCat) => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        }}
      />

      {/* Delete Expense Confirmation Dialog Modal */}
      <AnimatePresence>
        {deletingExpense && (
          <div className="fixed inset-0 z-50 bg-ink/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-modal w-full max-w-md rounded-2xl p-6 shadow-2xl border-coral/40 space-y-4 relative"
            >
              <div className="flex items-center justify-between pb-2 border-b border-ink/10 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-coral-light flex items-center justify-center text-coral shadow-xs">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-ink">Delete Expense?</h3>
                    <span className="text-[11px] text-ink-muted">This action cannot be undone</span>
                  </div>
                </div>
                <button
                  onClick={() => setDeletingExpense(null)}
                  className="p-1.5 rounded-lg hover:bg-ink/5 dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Expense details preview card */}
              <div className="p-4 rounded-xl bg-ink/5 dark:bg-white/5 border border-ink/10 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-ink">{deletingExpense.title}</span>
                  <span className="font-display font-extrabold text-base text-coral">
                    -{formatCurrency(deletingExpense.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-ink-muted pt-1 border-t border-ink/5 dark:border-white/5">
                  <span>Category: <strong className="text-ink">{deletingExpense.category_name || 'Uncategorized'}</strong></span>
                  <span>Date: <strong className="text-ink">{formatDate(deletingExpense.date)}</strong></span>
                </div>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                Are you sure you want to permanently delete this transaction? The amount will be removed from your recorded spend and restored to your available monthly budget.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setDeletingExpense(null)}
                  className="px-4 py-2.5 rounded-xl border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-coral hover:bg-coral-dark text-white text-xs font-bold rounded-xl shadow-md shadow-coral/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-ink-muted">Loading transactions...</span>
        </div>
      }
    >
      <ExpensesContent />
    </Suspense>
  );
}
