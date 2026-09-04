'use client';

import React, { useState, useEffect } from 'react';
import { Expense, Category, PaymentMode, ExpenseMood } from '@/types';
import { getTodayDateString, capitalizeFirstLetter } from '@/lib/utils';
import { X, Plus, AlertCircle, Repeat, Flame, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles, Wand2, Camera, Upload, Loader2 } from 'lucide-react';
import { categoryApi, dashboardApi, aiApi, SuggestCategoryResponse, ScanReceiptResponse } from '@/lib/api';
import { useCurrency, useFormatCurrency } from '@/providers/CurrencyProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MilestoneFeedback, evaluateSpendMilestone } from '@/lib/spendMilestoneAi';

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
    mood?: ExpenseMood | null;
    is_recurring?: boolean;
  }, milestone?: MilestoneFeedback) => Promise<void>;
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
  const [mood, setMood] = useState<ExpenseMood | ''>('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Inline Quick Category Creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catCreating, setCatCreating] = useState(false);

  // AI Auto-Categorization & Mood Detection state (FR-AI-3)
  const [aiSuggestion, setAiSuggestion] = useState<SuggestCategoryResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasManuallySelectedCategory, setHasManuallySelectedCategory] = useState(false);
  const [hasManuallySelectedPaymentMode, setHasManuallySelectedPaymentMode] = useState(false);
  const [hasManuallySelectedMood, setHasManuallySelectedMood] = useState(false);

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
      setMood(initialData.mood || '');
      setNotes(initialData.notes || '');
      setIsRecurring(Boolean(initialData.is_recurring));
    } else {
      setTitle('');
      setAmount('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setDate(getTodayDateString());
      setPaymentMode('');
      setMood('');
      setNotes('');
      setIsRecurring(false);
      setAiSuggestion(null);
      setHasManuallySelectedCategory(false);
      setHasManuallySelectedPaymentMode(false);
      setHasManuallySelectedMood(false);
    }
    setErrorMsg('');
  }, [initialData, isOpen, categories, currency]);

  // Real-time Budget & Alert Threshold Computations (must be before hooks that use them)
  const parsedViewAmount = parseFloat(amount) || 0;
  const parsedBaseAmount = parsedViewAmount > 0 ? Number(convertToBase(parsedViewAmount).toFixed(2)) : 0;

  // Real-time AI Auto-Categorization (FR-AI-3)
  useEffect(() => {
    if (!isOpen || initialData) return;
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) {
      setAiSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsPredicting(true);
      try {
        const res = await aiApi.suggestCategory(cleanTitle, parsedBaseAmount > 0 ? parsedBaseAmount : undefined);
        if (res && res.suggested_category) {
          setAiSuggestion(res);

          // Auto-select category if user hasn't explicitly chosen one yet
          if (!hasManuallySelectedCategory) {
            const matched = categories.find(
              (c) => c.name.toLowerCase() === res.suggested_category.toLowerCase()
            );
            if (matched) {
              setCategoryId(matched.id);
            }
          }

          // Auto-select payment mode if suggested and user hasn't explicitly chosen one
          if (res.suggested_payment_mode && !hasManuallySelectedPaymentMode && !paymentMode) {
            const validModes: PaymentMode[] = ['upi', 'card', 'cash', 'other'];
            const m = res.suggested_payment_mode.toLowerCase() as PaymentMode;
            if (validModes.includes(m)) {
              setPaymentMode(m);
            }
          }

          // Auto-select mood if suggested and user hasn't explicitly overridden it
          if (res.suggested_mood && !hasManuallySelectedMood) {
            setMood(res.suggested_mood);
          }
        }
      } catch (err) {
        // Silently preserve manual inputs — do not crash
      } finally {
        setIsPredicting(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [title, parsedBaseAmount, isOpen, initialData, categories, hasManuallySelectedCategory, hasManuallySelectedPaymentMode, paymentMode]);

  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    const matched = categories.find(
      (c) => c.name.toLowerCase() === aiSuggestion.suggested_category.toLowerCase()
    );
    if (matched) {
      setCategoryId(matched.id);
      setHasManuallySelectedCategory(true);
    }
    if (aiSuggestion.suggested_payment_mode) {
      const validModes: PaymentMode[] = ['upi', 'card', 'cash', 'other'];
      const m = aiSuggestion.suggested_payment_mode.toLowerCase() as PaymentMode;
      if (validModes.includes(m)) {
        setPaymentMode(m);
        setHasManuallySelectedPaymentMode(true);
      }
    }
    if (aiSuggestion.suggested_mood) {
      setMood(aiSuggestion.suggested_mood);
      setHasManuallySelectedMood(true);
    }
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setErrorMsg('');
    try {
      const data = await aiApi.scanReceipt(file);
      if (data.title === 'Receipt Scan Unavailable' || (data.confidence !== undefined && data.confidence === 0)) {
        setErrorMsg(data.notes || 'Vision-based receipt scanning requires an AI API Key (Gemini, OpenAI, or Anthropic) configured on the backend.');
        return;
      }
      if (data.title) setTitle(capitalizeFirstLetter(data.title));
      if (data.amount !== null && data.amount !== undefined) {
        const viewAmount = convertToView(data.amount);
        setAmount(Number(viewAmount.toFixed(2)).toString());
      }
      if (data.date) setDate(data.date);
      if (data.notes) setNotes(data.notes);
      if (data.category) {
        const match = categories.find(
          (c) => c.name.toLowerCase() === data.category!.toLowerCase()
        );
        if (match) {
          setCategoryId(match.id);
          setHasManuallySelectedCategory(true);
        }
      }
      if (data.payment_mode) {
        const validModes: PaymentMode[] = ['upi', 'card', 'cash', 'other'];
        const m = data.payment_mode.toLowerCase() as PaymentMode;
        if (validModes.includes(m)) {
          setPaymentMode(m);
          setHasManuallySelectedPaymentMode(true);
        }
      }
      if (data.mood) {
        setMood(data.mood);
        setHasManuallySelectedMood(true);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to scan receipt image.');
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  // Remaining computed values that only matter when modal is visible
  const initialBaseAmount = initialData ? initialData.amount : 0;
  const amountDelta = parsedBaseAmount - initialBaseAmount;

  // Check if expense date is in the current month
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = date.startsWith(currentMonthPrefix);

  // Monthly Budget Check (Strict Enforcement for current active month)
  const budgetLimit = summary?.budget_limit || 0;
  const alreadySpentWithoutThis = Math.max((summary?.total_spent || 0) - initialBaseAmount, 0);
  const projectedTotalSpent = alreadySpentWithoutThis + parsedBaseAmount;
  const remainingBudget = Math.max(budgetLimit - alreadySpentWithoutThis, 0);
  const projectedMonthlyPercent = budgetLimit > 0 ? Math.round((projectedTotalSpent / budgetLimit) * 100) : 0;
  
  // Strict over-budget flag
  const isOverMonthly = isCurrentMonth && budgetLimit > 0 && parsedBaseAmount > 0 && projectedTotalSpent > budgetLimit;
  const isNearMonthly = isCurrentMonth && budgetLimit > 0 && !isOverMonthly && projectedMonthlyPercent >= nearLimitThreshold;

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

    const milestone = evaluateSpendMilestone({
      expenseTitle: formattedTitle,
      expenseAmount: parsedBaseAmount,
      projectedTotalSpent,
      budgetLimit,
      projectedTodaySpent,
      dailyLimit,
      formatCurrency,
    });

    setIsSubmitting(true);
    try {
      await onSubmit(
        {
          title: formattedTitle,
          amount: parsedBaseAmount,
          category_id: categoryId,
          date,
          payment_mode: (paymentMode as PaymentMode) || null,
          mood: (mood as ExpenseMood) || null,
          notes: notes.trim() || null,
          is_recurring: isRecurring,
        },
        milestone
      );
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
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to create category');
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
          {/* Quick AI Receipt Scanner Bar */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-ink block">AI Receipt Scanner</span>
                <span className="text-[10px] text-ink-muted block">Snap or upload receipt to auto-fill</span>
              </div>
            </div>

            <label className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0">
              {isScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Bill</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={isScanning}
                onChange={handleScanReceipt}
                className="hidden"
              />
            </label>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">
              Title <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Swiggy gourmet dinner, Uber airport ride, Rent"
              value={title}
              onChange={(e) => setTitle(capitalizeFirstLetter(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm text-ink focus:outline-none focus:border-sage transition-all"
              required
            />

            {/* AI Auto-Categorization & Smart Tag Banner (FR-AI-3) */}
            <AnimatePresence>
              {(isPredicting || aiSuggestion) && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -4 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -4 }}
                  className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/25 flex items-center justify-between gap-2 overflow-hidden text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className={`w-3.5 h-3.5 text-emerald-500 shrink-0 ${isPredicting ? 'animate-spin' : 'animate-pulse'}`} />
                    {isPredicting ? (
                      <span className="text-[11px] text-[var(--color-text-muted)] italic">
                        Predicting category...
                      </span>
                    ) : aiSuggestion ? (
                      <span className="text-[11px] text-[var(--color-text-muted)] truncate">
                        Suggested: <strong className="text-[var(--color-text-primary)] font-semibold">{aiSuggestion.suggested_category}</strong>
                        {aiSuggestion.confidence ? (
                          <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ({Math.round(aiSuggestion.confidence * 100)}% match)
                          </span>
                        ) : null}
                        {aiSuggestion.suggested_payment_mode && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/60 dark:bg-black/40 border border-emerald-500/20 text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                            {aiSuggestion.suggested_payment_mode}
                          </span>
                        )}
                      </span>
                    ) : null}
                  </div>
                  {aiSuggestion && !isPredicting && (
                    <button
                      type="button"
                      onClick={handleApplyAiSuggestion}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      Apply
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border text-sm font-bold text-ink focus:outline-none transition-all ${
                  isOverMonthly
                    ? 'border-coral ring-2 ring-coral/20'
                    : 'border-ink/15 dark:border-white/15 focus:border-sage'
                }`}
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
                {/* Monthly Threshold Alert / Deficit Banner */}
                {isOverMonthly ? (
                  <div className="p-3.5 rounded-xl border border-coral/50 bg-coral-light/90 dark:bg-coral/25 text-coral flex items-start gap-3 shadow-xs">
                    <Flame className="w-5 h-5 mt-0.5 shrink-0 text-coral" />
                    <div>
                      <span className="font-bold text-sm block">⚠️ Monthly Budget Exceeded — Deficit Balance</span>
                      <p className="mt-1 leading-relaxed text-[11px]">
                        This transaction will bring total monthly spend to{' '}
                        <strong>{formatCurrency(projectedTotalSpent)}</strong> (
                        <strong>{projectedMonthlyPercent}%</strong> of your{' '}
                        {formatCurrency(budgetLimit)} budget). Your monthly balance will go into a deficit of{' '}
                        <strong className="underline">{formatCurrency(budgetLimit - projectedTotalSpent)}</strong>.
                      </p>
                    </div>
                  </div>
                ) : isNearMonthly ? (
                  <div className="p-3 rounded-xl border border-honey/40 bg-honey-light/80 dark:bg-honey/20 text-honey flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-honey" />
                    <div>
                      <span className="font-bold block">⚠️ Near Monthly Budget Limit Alert (≥{nearLimitThreshold}%)</span>
                      <p className="mt-0.5 leading-relaxed text-[11px]">
                        Adding this expense will bring your total monthly spend to{' '}
                        <strong>{formatCurrency(projectedTotalSpent)}</strong> (
                        <strong>{projectedMonthlyPercent}%</strong> of your{' '}
                        {formatCurrency(budgetLimit)} cap).
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Daily Cap Threshold Alert */}
                {(isOverDaily || isNearDaily) && !isOverMonthly && (
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
              onChange={(e) => {
                setCategoryId(e.target.value);
                setHasManuallySelectedCategory(true);
              }}
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
                  onClick={() => {
                    setPaymentMode(paymentMode === mode ? '' : mode);
                    setHasManuallySelectedPaymentMode(true);
                  }}
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

          {/* Emotion / Mood Selector (AI Auto-Predictive + Manual) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label className="block text-xs font-semibold text-ink-muted">
                  How did you feel? <span className="text-[11px] font-normal text-ink-muted/80">(AI Auto-detected)</span>
                </label>
                {aiSuggestion?.suggested_mood && !hasManuallySelectedMood && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    ✨ AI Suggested
                  </span>
                )}
              </div>
              {mood && (
                <button
                  type="button"
                  onClick={() => {
                    setMood('');
                    setHasManuallySelectedMood(true);
                  }}
                  className="text-[11px] text-ink-muted hover:text-coral transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Over-budget Stressed Mood Alert Trigger */}
            {(isOverMonthly || isOverDaily) && (
              <div className="mb-2 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>
                  {isOverMonthly
                    ? 'Monthly budget limit breached — AI automatically flagged Stressed mood'
                    : 'Daily spending limit breached — AI automatically flagged Stressed mood'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'happy', label: 'Happy', emoji: '😊' },
                { id: 'normal', label: 'Normal', emoji: '😐' },
                { id: 'sad', label: 'Sad', emoji: '😔' },
                { id: 'stressed', label: 'Stressed', emoji: '😰' },
                { id: 'excited', label: 'Excited', emoji: '🤩' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMood(mood === item.id ? '' : (item.id as ExpenseMood));
                    setHasManuallySelectedMood(true);
                  }}
                  className={`py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    mood === item.id
                      ? 'bg-sage/15 border-sage dark:bg-sage/25 shadow-xs font-bold'
                      : 'bg-white/60 dark:bg-white/5 border-ink/10 dark:border-white/10 hover:bg-white text-ink-muted'
                  }`}
                >
                  <span className="text-lg leading-none">{item.emoji}</span>
                  <span className="text-[10px] truncate max-w-full leading-none">{item.label}</span>
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
              className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isOverMonthly
                  ? 'bg-coral hover:bg-coral-dark shadow-coral/20'
                  : 'bg-sage hover:bg-sage-dark shadow-sage/20'
              }`}
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : isOverMonthly ? (
                <>
                  <Flame className="w-3.5 h-3.5" />
                  <span>{initialData ? 'Update Expense (Over Budget)' : 'Log Expense (Over Budget)'}</span>
                </>
              ) : isNearMonthly ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{initialData ? 'Update Expense' : 'Log Expense'}</span>
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
