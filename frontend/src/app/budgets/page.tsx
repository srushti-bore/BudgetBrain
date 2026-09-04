'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApi, categoryApi, aiApi } from '@/lib/api';
import { Budget, Category } from '@/types';
import { useFormatCurrency, useCurrency } from '@/providers/CurrencyProvider';
import { Target, Plus, CheckCircle, AlertTriangle, Flame, Edit2, ShieldAlert, Sparkles, Wand2, RefreshCw, Loader2, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BudgetsPage() {
  const formatCurrency = useFormatCurrency();
  const { currency, convertToView, convertToBase } = useCurrency();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | 'overall'>('overall');
  const [limitAmount, setLimitAmount] = useState('');
  const [dailyLimitAmount, setDailyLimitAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdopting, setIsAdopting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const { data: budgets = [], isLoading: isBudgetsLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetApi.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list(),
  });

  // AI Adaptive Budget Recommendation (FR-AI-4)
  const {
    data: aiBudget,
    isLoading: isAiBudgetLoading,
    isFetching: isAiBudgetFetching,
    isError: isAiBudgetError,
    refetch: refetchAiBudget,
  } = useQuery({
    queryKey: ['aiBudgetSuggestion'],
    queryFn: () => aiApi.suggestBudget(),
    staleTime: 5 * 60 * 1000,
  });

  const overallBudget = budgets.find((b) => b.category_id === null);
  const categoryBudgets = budgets.filter((b) => b.category_id !== null);

  const budgetMutation = useMutation({
    mutationFn: budgetApi.createOrUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const handleOpenModal = (catId: string | 'overall', existingLimit?: number, existingDailyLimit?: number | null) => {
    setSelectedCatId(catId);
    if (catId === 'overall') {
      const viewLimit = existingLimit ? convertToView(existingLimit) : 0;
      const viewDailyLimit = existingDailyLimit ? convertToView(existingDailyLimit) : 0;
      setLimitAmount(viewLimit > 0 ? Number(viewLimit.toFixed(2)).toString() : '');
      setDailyLimitAmount(viewDailyLimit > 0 ? Number(viewDailyLimit.toFixed(2)).toString() : '');
    } else {
      const viewLimit = existingLimit ? convertToView(existingLimit) : 0;
      setLimitAmount(viewLimit > 0 ? Number(viewLimit.toFixed(2)).toString() : '');
      setDailyLimitAmount('');
    }
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleApplyAiRecommendation = (monthlyLimit?: number, dailyLimit?: number) => {
    const m = monthlyLimit ?? aiBudget?.recommended_monthly_limit;
    const d = dailyLimit ?? aiBudget?.recommended_daily_limit;
    if (m !== undefined) {
      const viewM = convertToView(m);
      setLimitAmount(Number(viewM.toFixed(2)).toString());
    }
    if (d !== undefined) {
      const viewD = convertToView(d);
      setDailyLimitAmount(Number(viewD.toFixed(2)).toString());
    }
    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 2500);
    setSelectedCatId('overall');
    setIsModalOpen(true);
  };

  // 1-Click Instant Adoption of AI Recommended Budget Limits
  const handleOneClickAdopt = async () => {
    if (!aiBudget) return;
    setIsAdopting(true);
    try {
      await budgetMutation.mutateAsync({
        category_id: null,
        limit_amount: aiBudget.recommended_monthly_limit,
        daily_limit: aiBudget.recommended_daily_limit > 0 ? aiBudget.recommended_daily_limit : null,
      });
      showToast(
        `✨ Adopted AI Recommendation! Overall monthly budget set to ${formatCurrency(aiBudget.recommended_monthly_limit)}${
          aiBudget.recommended_daily_limit > 0 ? ` with ${formatCurrency(aiBudget.recommended_daily_limit)}/day cap` : ''
        }!`,
        'success'
      );
    } catch (err: any) {
      console.error('Adopt recommendation failure:', err);
      const msg = err?.response?.data?.error?.message || 'Failed to adopt AI budget recommendation';
      showToast(msg, 'error');
    } finally {
      setIsAdopting(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountInView = parseFloat(limitAmount);
    const dailyLimitInView = dailyLimitAmount ? parseFloat(dailyLimitAmount) : null;

    if (isNaN(amountInView) || amountInView <= 0) {
      setErrorMsg(`Limit amount must be a positive number greater than ${currency === 'INR' ? '₹0' : '0'}`);
      return;
    }

    if (dailyLimitInView !== null && (isNaN(dailyLimitInView) || dailyLimitInView <= 0)) {
      setErrorMsg(`Daily limit must be a positive number greater than ${currency === 'INR' ? '₹0' : '0'}`);
      return;
    }

    const limitAmountInBase = Number(convertToBase(amountInView).toFixed(2));
    const dailyLimitInBase = dailyLimitInView !== null ? Number(convertToBase(dailyLimitInView).toFixed(2)) : null;

    const now = new Date();
    const currentPeriodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await budgetMutation.mutateAsync({
        category_id: selectedCatId === 'overall' ? null : selectedCatId,
        limit_amount: limitAmountInBase,
        daily_limit: selectedCatId === 'overall' ? dailyLimitInBase : null,
        period_type: 'monthly',
        period_start: currentPeriodStart,
      });
      setIsModalOpen(false);
      showToast(
        selectedCatId === 'overall'
          ? 'Master monthly & daily budget saved successfully!'
          : 'Category budget limit updated successfully!',
        'success'
      );
    } catch (err: any) {
      console.error('Budget save failure:', err);
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.detail?.[0]?.msg ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to save budget limit';
      setErrorMsg(typeof msg === 'string' ? msg : 'Failed to save budget limit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status?: string, percentage: number = 0) => {
    if (status === 'over_budget' || percentage >= 100) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-coral-light text-coral border border-coral/30 text-xs font-bold flex items-center gap-1">
          <Flame className="w-3.5 h-3.5" /> Over Budget
        </span>
      );
    }
    if (status === 'near_limit' || percentage >= 80) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-honey-light text-honey border border-honey/30 text-xs font-bold flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Near Limit (≥80%)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full bg-sage-light text-sage border border-sage/30 text-xs font-bold flex items-center gap-1">
        <CheckCircle className="w-3.5 h-3.5" /> On Track
      </span>
    );
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
                : 'bg-coral-light text-coral border-coral/40 dark:bg-coral/20 dark:text-coral shadow-coral/10'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Budget Goal Tracker
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-0.5">
            Set monthly overall & per-category spending targets
          </p>
        </div>

        <button
          onClick={() => handleOpenModal('overall', overallBudget?.limit_amount, overallBudget?.daily_limit)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-[#3E7259] text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-sage/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Target className="w-4 h-4" />
          <span>{overallBudget ? 'Edit Overall Limit' : 'Set Overall Budget'}</span>
        </button>
      </div>

      {/* AI Adaptive Budget Limit Recommendation Card (FR-AI-4) */}
      {isAiBudgetLoading && !aiBudget ? (
        <div className="glass-card p-5 sm:p-6 border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  AI Adaptive Recommendation
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Calculating Targets...
                </span>
              </div>
              <div className="h-5 w-56 sm:w-72 bg-emerald-500/20 rounded-md" />
              <div className="h-3.5 w-72 sm:w-96 max-w-full bg-ink/10 dark:bg-white/10 rounded" />
            </div>
          </div>
          <div className="h-9 w-36 bg-emerald-600/30 rounded-xl hidden sm:block shrink-0" />
        </div>
      ) : isAiBudgetError && !aiBudget ? (
        <div className="glass-card p-4 sm:p-5 border-amber-500/35 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-ink block">AI Recommendation Offline</span>
              <span className="text-[11px] text-ink-muted block">Could not compute velocity targets. Click retry to recalculate.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetchAiBudget()}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : aiBudget ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 sm:p-6 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    AI Adaptive Recommendation
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    {aiBudget.estimated_savings_rate}% Target Savings
                  </span>
                </div>
                <h3 className="font-display font-bold text-base sm:text-lg text-ink">
                  Optimal Target: {formatCurrency(aiBudget.recommended_monthly_limit)} / month
                  {aiBudget.recommended_daily_limit > 0 && (
                    <span className="text-xs text-ink-muted font-normal ml-2">
                      ({formatCurrency(aiBudget.recommended_daily_limit)} / day cap)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-ink-muted max-w-2xl leading-relaxed">
                  {aiBudget.rationale}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
              <button
                type="button"
                onClick={() => refetchAiBudget()}
                disabled={isAiBudgetFetching}
                className="p-2 rounded-xl border border-ink/10 dark:border-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
                title="Recalculate AI Recommendation"
              >
                <RefreshCw className={`w-4 h-4 ${isAiBudgetFetching ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => handleApplyAiRecommendation()}
                className="px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Customize targets in modal before saving"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customize</span>
              </button>

              <button
                type="button"
                onClick={handleOneClickAdopt}
                disabled={isAdopting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="1-Click Adopt: Immediately save recommended limits"
              >
                {isAdopting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Adopting...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>1-Click Adopt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* Main Overall Monthly Budget Card */}
      <div className="glass-card p-6 border-sage/30 bg-gradient-to-br from-white/80 via-white/50 to-sage-light/20 dark:from-white/5 dark:to-sage/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sage/20 flex items-center justify-center text-sage border border-sage/30">
              <Target className="w-6 h-6 text-ink" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-ink">Overall Monthly Budget</h2>
              <p className="text-xs text-ink-muted">Master Spending Limit (Required)</p>
            </div>
          </div>

          {overallBudget && (
            <div className="self-start sm:self-auto">
              {getStatusBadge(
                overallBudget.status,
                overallBudget.limit_amount > 0
                  ? ((overallBudget.spent_amount || 0) / overallBudget.limit_amount) * 100
                  : 0
              )}
            </div>
          )}
        </div>

        {overallBudget ? (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/60 dark:bg-white/5 p-4 rounded-xl border border-ink/5 dark:border-white/10">
                <span className="text-xs text-ink-muted font-medium block">Monthly Limit</span>
                <span className="font-display font-extrabold text-2xl text-ink block mt-0.5">
                  {formatCurrency(overallBudget.limit_amount)}
                </span>
              </div>

              <div className="bg-white/60 dark:bg-white/5 p-4 rounded-xl border border-ink/5 dark:border-white/10">
                <span className="text-xs text-ink-muted font-medium block">Spent So Far</span>
                <span className="font-display font-extrabold text-2xl text-coral block mt-0.5">
                  {formatCurrency(overallBudget.spent_amount || 0)}
                </span>
              </div>

              <div className="bg-white/60 dark:bg-white/5 p-4 rounded-xl border border-ink/5 dark:border-white/10">
                <span className="text-xs text-ink-muted font-medium block">
                  {(overallBudget.remaining_amount ?? 0) < 0 ? 'Monthly Deficit' : 'Remaining Limit'}
                </span>
                <span
                  className={`font-display font-extrabold text-2xl block mt-0.5 ${
                    (overallBudget.remaining_amount ?? 0) < 0 ? 'text-coral' : 'text-sage'
                  }`}
                >
                  {formatCurrency(overallBudget.remaining_amount || 0)}
                </span>
              </div>
            </div>

            {overallBudget.daily_limit && (
              <div className="bg-white/40 dark:bg-white/5 p-4 rounded-xl border border-ink/5 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs text-ink-muted font-semibold block">Configured Daily Limit</span>
                  <span className="text-xs text-ink-muted mt-0.5">Target cap for daily transaction volume</span>
                </div>
                <span className="font-display font-bold text-xl text-honey">
                  {formatCurrency(overallBudget.daily_limit)} / day
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <ShieldAlert className="w-8 h-8 text-honey mx-auto mb-2" />
            <p className="text-xs text-ink-muted mb-3">No master overall budget limit set yet.</p>
            <button
              onClick={() => handleOpenModal('overall')}
              className="px-4 py-2 bg-sage hover:bg-[#3E7259] text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
            >
              Set Master Monthly Budget
            </button>
          </div>
        )}
      </div>

      {/* Per-Category Budgets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Per-Category Budgets</h3>
            <p className="text-xs text-ink-muted">Optional category-specific spending caps</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const existing = categoryBudgets.find((b) => b.category_id === cat.id);
            const spent = existing?.spent_amount || 0;
            const limit = existing?.limit_amount || 0;
            const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const isOver = limit > 0 && spent > limit;

            return (
              <div key={cat.id} className="glass-card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display font-bold text-base text-ink">{cat.name}</span>
                    {existing ? (
                      getStatusBadge(existing.status, percentage)
                    ) : (
                      <span className="text-[11px] text-ink-muted bg-ink/5 dark:bg-white/10 px-2 py-0.5 rounded">No Limit</span>
                    )}
                  </div>

                  {existing ? (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-ink-muted">Spent: {formatCurrency(spent)}</span>
                        {isOver ? (
                          <span className="text-coral font-bold">Deficit: {formatCurrency(limit - spent)}</span>
                        ) : (
                          <span className="text-ink font-semibold">Limit: {formatCurrency(limit)}</span>
                        )}
                      </div>
                      <div className="h-2 w-full bg-ink/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentage >= 100 ? 'bg-coral' : percentage >= 80 ? 'bg-honey' : 'bg-sage'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted py-2">No category limit configured.</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-ink/5 dark:border-white/10 flex items-center justify-end">
                  <button
                    onClick={() => handleOpenModal(cat.id, existing?.limit_amount)}
                    className="px-3 py-1 rounded-lg border border-ink/15 dark:border-white/15 hover:bg-white/60 dark:hover:bg-white/10 text-ink text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-sage" />
                    <span>{existing ? 'Edit Limit' : 'Set Limit'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Set Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h2 className="font-display font-bold text-lg text-ink mb-1">
              {selectedCatId === 'overall'
                ? 'Set Master Overall Monthly Limit'
                : `Set Budget Limit for ${categories.find((c) => c.id === selectedCatId)?.name}`}
            </h2>
            <p className="text-xs text-ink-muted mb-4">
              Enter maximum allowed spending limit per month ({currency})
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-coral-light border border-coral/30 rounded-xl text-xs font-medium text-coral">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="space-y-4">
              {/* AI Auto-fill helper inside modal */}
              {selectedCatId === 'overall' && aiBudget && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-ink-muted truncate">
                      AI Target: <strong className="text-ink font-semibold">{formatCurrency(aiBudget.recommended_monthly_limit)}</strong>
                      {aiBudget.recommended_daily_limit > 0 ? ` (${formatCurrency(aiBudget.recommended_daily_limit)}/day)` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyAiRecommendation()}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    {autoFilled ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-200" />
                        <span>Filled! ✨</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3" />
                        <span>Auto-fill</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Monthly Limit ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={`e.g. ${currency === 'INR' ? '50000' : '600'}`}
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm font-bold text-ink focus:outline-none focus:border-sage"
                  required
                />
              </div>

              {selectedCatId === 'overall' && (
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">Daily Limit (Optional) ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={`e.g. ${currency === 'INR' ? '1500' : '20'} (leave blank for none)`}
                    value={dailyLimitAmount}
                    onChange={(e) => setDailyLimitAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm font-bold text-ink focus:outline-none focus:border-sage"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink hover:bg-white dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-sage hover:bg-[#3E7259] text-white text-xs font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
