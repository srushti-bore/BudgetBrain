'use client';

import React, { useState, useEffect } from 'react';
import { Expense, Category, PaymentMode } from '@/types';
import { getTodayDateString, capitalizeFirstLetter } from '@/lib/utils';
import { X, Plus, AlertCircle, Repeat, Flame, AlertTriangle, ShieldCheck } from 'lucide-react';
import { categoryApi, dashboardApi } from '@/lib/api';
import { useCurrency, useFormatCurrency } from '@/providers/CurrencyProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    category_id: string;
    date: string;
    notes?: string | null;
    payment_mode?: PaymentMode | null;
    is_recurring?: boolean;
  }) => Promise<void>;
  initialData?: Expense | null;
  categories: Category[];
  onCategoryCreated?: (newCategory: Category) => void;
}

export default function ExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  onCategoryCreated,
}: ExpenseModalProps) {
  const formatCurrency = useFormatCurrency();
  const { currency, convertToView, convertToBase } = useCurrency();
  const { nearLimitThreshold = 80 } = useSettings();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [paymentMode, setPaymentMode] = useState<PaymentMode | ''>('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Inline Quick Category Creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catCreating, setCatCreating] = useState(false);

  // Fetch current dashboard summary to calculate budget impact in real time
  const { data: summary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: dashboardApi.getSummary,
    enabled: isOpen,
  });

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      const viewAmount = convertToView(initialData.amount);
      setAmount(Number(viewAmount.toFixed(2)).toString());
      setCategoryId(initialData.category_id);
      setDate(initialData.date);
      setPaymentMode(initialData.payment_mode || '');
      setNotes(initialData.notes || '');
      setIsRecurring(Boolean(initialData.is_recurring));
    } else {
      setTitle('');
      setAmount('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setDate(getTodayDateString());
      setPaymentMode('');
      setNotes('');
      setIsRecurring(false);
    }
    setErrorMsg('');
  }, [initialData, isOpen, categories, currency]);

  if (!isOpen) return null;

  // Real-time Budget & Alert Threshold Computations
  const parsedViewAmount = parseFloat(amount) || 0;
  const parsedBaseAmount = parsedViewAmount > 0 ? Number(convertToBase(parsedViewAmount).toFixed(2)) : 0;
  const initialBaseAmount = initialData ? initialData.amount : 0;
  const amountDelta = parsedBaseAmount - initialBaseAmount;

  // Monthly Budget Check
  const budgetLimit = summary?.budget_limit || 0;
  const projectedTotalSpent = Math.max((summary?.total_spent || 0) + amountDelta, 0);
  const projectedMonthlyPercent = budgetLimit > 0 ? Math.round((projectedTotalSpent / budgetLimit) * 100) : 0;
  const isOverMonthly = budgetLimit > 0 && projectedTotalSpent > budgetLimit;
  const isNearMonthly = budgetLimit > 0 && !isOverMonthly && projectedMonthlyPercent >= nearLimitThreshold;

  // Daily Limit Check
  const isToday = date === getTodayDateString();
  const dailyLimit = summary?.daily_limit || 0;
  const projectedTodaySpent = Math.max((summary?.today_spent || 0) + (isToday ? amountDelta : 0), 0);
  const projectedDailyPercent = dailyLimit > 0 ? Math.round((projectedTodaySpent / dailyLimit) * 100) : 0;
  const isOverDaily = isToday && dailyLimit > 0 && projectedTodaySpent > dailyLimit;
  const isNearDaily = isToday && dailyLimit > 0 && !isOverDaily && projectedDailyPercent >= nearLimitThreshold;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const formattedTitle = capitalizeFirstLetter(title);
    if (!formattedTitle) {
      setErrorMsg('Expense title is required');
      return;
    }
    if (parsedViewAmount <= 0) {
      setErrorMsg(`Amount must be a positive number greater than ${currency === 'INR' ? '₹0' : '0'}`);
      return;
    }
    if (!categoryId) {
      setErrorMsg('Please select a category');
      return;
    }
    if (date > getTodayDateString()) {
      setErrorMsg('Expense date cannot be in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: formattedTitle,
        amount: parsedBaseAmount,
        category_id: categoryId,
        date,
        payment_mode: (paymentMode as PaymentMode) || null,
        notes: notes.trim() || null,
        is_recurring: isRecurring,
      });
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to save expense';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    const formattedName = capitalizeFirstLetter(newCatName);
    if (!formattedName) return;
    setCatCreating(true);
    try {
      const created = await categoryApi.create({ name: formattedName });
      if (onCategoryCreated) onCategoryCreated(created);
      setCategoryId(created.id);
      setNewCatName('');
      setIsAddingCategory(false);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to create category');
    } finally {
      setCatCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="glass-modal w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-ink/10 dark:border-white/10">
          <h2 className="font-display font-bold text-xl text-ink">
            {initialData ? 'Edit Expense' : 'Log New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-ink/5 dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-coral-light border border-coral/30 rounded-xl text-xs font-medium text-coral flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">
              Title <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Grocery Shopping, House Rent, Fuel"
              value={title}
              onChange={(e) => setTitle(capitalizeFirstLetter(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm text-ink focus:outline-none focus:border-sage transition-all"
              required
            />
          </div>

          {/* Amount and Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Amount ({currency}) <span className="text-coral">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm font-bold text-ink focus:outline-none focus:border-sage transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Date <span className="text-coral">*</span>
              </label>
              <input
                type="date"
                max={getTodayDateString()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm text-ink focus:outline-none focus:border-sage transition-all"
                required
              />
            </div>
          </div>

          {/* Live Real-time Budget Threshold Alert Banner */}
          <AnimatePresence>
            {parsedViewAmount > 0 && (isOverMonthly || isNearMonthly || isOverDaily || isNearDaily) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {/* Monthly Threshold Alert */}
                {(isOverMonthly || isNearMonthly) && (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      isOverMonthly
                        ? 'bg-coral-light/80 dark:bg-coral/20 border-coral/40 text-coral'
                        : 'bg-honey-light/80 dark:bg-honey/20 border-honey/40 text-honey'
                    }`}
                  >
                    {isOverMonthly ? (
                      <Flame className="w-4 h-4 mt-0.5 shrink-0 animate-pulse text-coral" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-honey" />
                    )}
                    <div>
                      <span className="font-bold block">
                        {isOverMonthly
                          ? '🔥 Monthly Budget Exceeded Alert!'
                          : `⚠️ Near Monthly Budget Limit Alert (≥${nearLimitThreshold}%)`}
                      </span>
                      <p className="mt-0.5 leading-relaxed text-[11px]">
                        Adding this expense will bring your total monthly spend to{' '}
                        <strong>{formatCurrency(projectedTotalSpent)}</strong> (
                        <strong>{projectedMonthlyPercent}%</strong> of your{' '}
                        {formatCurrency(budgetLimit)} cap).
                      </p>
                    </div>
                  </div>
                )}

                {/* Daily Cap Threshold Alert */}
                {(isOverDaily || isNearDaily) && (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      isOverDaily
                        ? 'bg-coral-light/80 dark:bg-coral/20 border-coral/40 text-coral'
                        : 'bg-honey-light/80 dark:bg-honey/20 border-honey/40 text-honey'
                    }`}
                  >
                    {isOverDaily ? (
                      <Flame className="w-4 h-4 mt-0.5 shrink-0 animate-pulse text-coral" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-honey" />
                    )}
                    <div>
                      <span className="font-bold block">
                        {isOverDaily ? '🔥 Daily Spending Limit Exceeded!' : `⚡ Daily Cap Warning (≥${nearLimitThreshold}%)`}
                      </span>
                      <p className="mt-0.5 leading-relaxed text-[11px]">
                        Today&apos;s spending will reach{' '}
                        <strong>{formatCurrency(projectedTodaySpent)}</strong> (
                        <strong>{projectedDailyPercent}%</strong> of {formatCurrency(dailyLimit)} daily limit).
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category Dropdown with inline creation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-ink-muted">
                Category <span className="text-coral">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="text-[11px] font-bold text-sage hover:text-sage/80 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> New Category
              </button>
            </div>

            {isAddingCategory ? (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="New category name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-sage/40 text-xs text-ink focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={catCreating}
                  className="px-3 py-1.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : null}

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm text-ink focus:outline-none focus:border-sage transition-all cursor-pointer"
              required
            >
              <option value="" disabled>
                Select Category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">Payment Mode</label>
            <div className="grid grid-cols-4 gap-2">
              {(['upi', 'card', 'cash', 'other'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(paymentMode === mode ? '' : mode)}
                  className={`py-2 text-xs font-bold capitalize rounded-xl border transition-all cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-sage-light text-sage border-sage/40 dark:bg-sage/20 shadow-xs'
                      : 'border-ink/10 dark:border-white/10 text-ink-muted hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Recurring Expense Checkbox */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-ink/5 dark:bg-white/5 border border-ink/5 dark:border-white/10">
            <input
              type="checkbox"
              id="is_recurring_checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded text-sage focus:ring-sage border-ink/20 cursor-pointer"
            />
            <label htmlFor="is_recurring_checkbox" className="text-xs font-medium text-ink flex items-center gap-1.5 cursor-pointer">
              <Repeat className="w-3.5 h-3.5 text-sage" />
              <span>Mark as Recurring Monthly Subscription (Rent, Netflix, WiFi, etc.)</span>
            </label>
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Notes (Optional)</label>
            <textarea
              placeholder="Add extra context or details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-xs text-ink focus:outline-none focus:border-sage transition-all resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                isOverMonthly || isOverDaily
                  ? 'bg-coral hover:bg-coral-dark shadow-coral/20'
                  : 'bg-sage hover:bg-sage-dark shadow-sage/20'
              }`}
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : isOverMonthly ? (
                <>
                  <Flame className="w-3.5 h-3.5" />
                  <span>Log Expense Anyway</span>
                </>
              ) : isNearMonthly ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Log Expense</span>
                </>
              ) : (
                <span>{initialData ? 'Update Expense' : 'Log Expense'}</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
