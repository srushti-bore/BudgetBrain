'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, Variants } from 'framer-motion';
import { dashboardApi, API_BASE_URL } from '@/lib/api';
import BudgetRing from '@/components/dashboard/BudgetRing';
import CategoryDonutChart from '@/components/dashboard/CategoryDonutChart';
import SpendTrendChart from '@/components/dashboard/SpendTrendChart';
import MonthlyCategoryGraph from '@/components/dashboard/MonthlyCategoryGraph';
import MonthComparisonCard from '@/components/dashboard/MonthComparisonCard';
import TopCategoriesWidget from '@/components/dashboard/TopCategoriesWidget';
import RecentExpensesSnapshot from '@/components/dashboard/RecentExpensesSnapshot';
import { useFormatCurrency } from '@/providers/CurrencyProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { useTranslation } from '@/providers/LanguageProvider';
import { useAuth } from '@/providers/AuthProvider';
import MonthlyStatsReport from '@/components/dashboard/MonthlyStatsReport';
import { Wallet, Calendar, PlusCircle, AlertCircle, Target, CheckCircle, AlertTriangle, Flame, MoreVertical, LogOut, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [showTopUserMenu, setShowTopUserMenu] = useState(false);
  const topUserMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (topUserMenuRef.current && !topUserMenuRef.current.contains(event.target as Node)) {
        setShowTopUserMenu(false);
      }
    }
    if (showTopUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTopUserMenu]);

  const formatCurrency = useFormatCurrency();
  const { showPredictiveInsights, nearLimitThreshold = 80 } = useSettings();
  const { t } = useTranslation();

  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: dashboardApi.getSummary,
  });

  const { data: categorySpend = [] } = useQuery({
    queryKey: ['categorySpend'],
    queryFn: () => dashboardApi.getByCategory(),
  });

  const { data: trendData = [] } = useQuery({
    queryKey: ['spendTrend', 'day'],
    queryFn: () => dashboardApi.getTrend('day'),
  });

  const { data: comparison = null } = useQuery({
    queryKey: ['monthComparison'],
    queryFn: dashboardApi.getComparison,
  });

  const { data: topCategories = [] } = useQuery({
    queryKey: ['topCategories'],
    queryFn: () => dashboardApi.getTopCategories(5),
  });

  // Computed helpers
  const now = new Date();
  const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const elapsedDays = now.getDate();
  const periodStart = `${now.toLocaleDateString('en-US', { month: 'short' })} 1`;
  const periodEnd = `${now.toLocaleDateString('en-US', { month: 'short' })} ${elapsedDays}`;

  if (isSummaryLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-3 border-sage border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-ink-muted">Loading BudgetBrain Dashboard...</span>
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="glass-card p-8 text-center max-w-lg mx-auto my-12 border-coral/30">
        <AlertCircle className="w-10 h-10 text-coral mx-auto mb-3" />
        <h3 className="font-display font-bold text-lg text-ink mb-1">Backend Connection Error</h3>
        <p className="text-xs text-ink-muted mb-2">
          Unable to connect to FastAPI backend at <code className="bg-ink/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono text-[11px]">{API_BASE_URL}</code>.
        </p>
        <p className="text-[11px] text-ink-muted/80 mb-4 italic">
          Note: Render free server takes 30-50s to wake up on first visit. Please wait and retry.
        </p>
        <button
          onClick={() => refetchSummary()}
          className="px-4 py-2 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-xl shadow-md transition-colors duration-200"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Computed values for daily limit
  const dailySpent = summary?.today_spent || 0;
  const dailyCap = summary?.daily_limit || 0;
  const dailyLimitPercent = dailyCap > 0
    ? Math.min(Math.round((dailySpent / dailyCap) * 100), 999)
    : 0;
  const dailyRemaining = Math.max(dailyCap - dailySpent, 0);
  const dailyExceeded = dailyCap > 0 && dailySpent > dailyCap;
  const dailyNearLimit = dailyCap > 0 && !dailyExceeded && dailyLimitPercent >= nearLimitThreshold;

  // Average daily spend
  const avgDailySpend = elapsedDays > 0 ? (summary?.total_spent || 0) / elapsedDays : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 md:space-y-8 max-w-8xl mx-auto pb-20"
    >
      {/* Dashboard Top Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-[1.85rem] text-ink tracking-tight leading-tight">
            {t('dashboard_title', 'Financial Overview')}
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-1.5 tracking-wide font-medium">
            {currentMonthName} · {t('dashboard_subtitle', 'Real-time financial intelligence, predictive health & budget analytics')}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* User Profile Capsule with 3-Dots Dropdown */}
          {user && (
            <div className="relative" ref={topUserMenuRef}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-ink/5 dark:bg-white/5 border border-ink/10 dark:border-white/10 hover:border-sage/40 transition-all">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-ink dark:text-cream max-w-[140px] truncate">
                  {user.full_name || 'My Account'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowTopUserMenu((prev) => !prev)}
                  className="p-1 rounded-lg text-ink-muted hover:text-ink dark:hover:text-cream hover:bg-ink/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Account menu"
                  aria-label="Account menu"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Top Dropdown Popover */}
              {showTopUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-white dark:bg-[#1c2824] rounded-2xl shadow-xl border border-ink/10 dark:border-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-ink/5 dark:border-white/5 mb-1">
                    <p className="text-xs font-bold text-ink dark:text-cream truncate">
                      {user.full_name || 'My Account'}
                    </p>
                    <p className="text-[10px] text-ink-muted truncate">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setShowTopUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink dark:hover:text-cream hover:bg-ink/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-sage" />
                    <span>Account Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setShowTopUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <Link
            href="/expenses?action=new"
            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-sage/20 hover:shadow-lg hover:shadow-sage/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
            <span>{t('log_expense', 'Log Expense')}</span>
          </Link>
        </div>
      </motion.div>


      {/* Top Metrics Banner */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Current Month Spend */}
        <motion.div
          whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 30px -10px rgba(0,0,0,0.06)' }}
          whileTap={{ scale: 0.995 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="glass-card glass-card-hover p-6 flex items-start gap-4 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-sage-light flex items-center justify-center text-sage shrink-0 border border-sage/30">
            <Calendar className="w-6 h-6 text-ink font-bold" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] text-ink-muted font-semibold block mb-1 tracking-wider uppercase">
              Current Month Spend
            </span>
            <span className="font-display font-extrabold text-2xl md:text-3xl text-ink block leading-tight">
              {formatCurrency(summary?.total_spent)}
            </span>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[11px] text-ink-muted font-medium">
                Avg. <strong className="text-ink font-bold">{formatCurrency(avgDailySpend)}</strong>/day
              </span>
              <span className="w-px h-3 bg-ink/10 dark:bg-white/10" />
              <span className="text-[11px] text-ink-muted font-medium">
                Day {elapsedDays}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Total Transactions */}
        <motion.div
          whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 30px -10px rgba(0,0,0,0.06)' }}
          whileTap={{ scale: 0.995 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="glass-card glass-card-hover p-6 flex items-start gap-4 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-sky-light flex items-center justify-center text-sky shrink-0 border border-sky/30">
            <Wallet className="w-6 h-6 text-ink font-bold" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] text-ink-muted font-semibold block mb-1 tracking-wider uppercase">
              Total Transactions
            </span>
            <span className="font-display font-extrabold text-2xl md:text-3xl text-ink block leading-tight">
              {summary?.expense_count ?? 0} <span className="text-base font-bold text-ink-muted">logged</span>
            </span>
            <div className="mt-2">
              <span className="text-[11px] text-ink-muted font-medium">
                {periodStart} – {periodEnd}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Daily Spend Limit Card (Conditional) — 3-Tier Alert Thresholds */}
      {summary?.daily_limit ? (
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 28px -8px rgba(0,0,0,0.06)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className={`glass-card p-5 border ${
            dailyExceeded
              ? 'border-coral/40 bg-gradient-to-r from-white/95 to-coral-light/25 dark:from-[#17211d] dark:to-coral/10'
              : dailyNearLimit
              ? 'border-honey/40 bg-gradient-to-r from-white/95 to-honey-light/25 dark:from-[#17211d] dark:to-honey/10'
              : 'border-sage/35 bg-gradient-to-r from-white/95 to-sage-light/15 dark:from-[#17211d] dark:to-sage/8'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Left: Icon + Label + Status */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                  dailyExceeded
                    ? 'bg-coral/10 text-coral border-coral/30'
                    : dailyNearLimit
                    ? 'bg-honey/10 text-honey border-honey/30'
                    : 'bg-sage/10 text-sage border-sage/30'
                }`}
              >
                <Target className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm text-ink">Daily Spending Limit</h3>
                  {dailyExceeded ? (
                    <span className="px-2 py-0.5 rounded-full bg-coral-light text-coral border border-coral/30 text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                      <Flame className="w-3 h-3" /> Over Daily Limit
                    </span>
                  ) : dailyNearLimit ? (
                    <span className="px-2 py-0.5 rounded-full bg-honey-light text-honey border border-honey/30 text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                      <AlertTriangle className="w-3 h-3" /> Near Limit (≥{nearLimitThreshold}%)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-sage-light text-sage border border-sage/30 text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                      <CheckCircle className="w-3 h-3" /> On Track
                    </span>
                  )}
                </div>
                {/* Progress Bar with inline percentage */}
                <div className="flex items-center gap-2.5 mt-2">
                  <div className="flex-1 h-2 bg-ink/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dailyExceeded ? 'bg-coral' : dailyNearLimit ? 'bg-honey' : 'bg-sage'
                      }`}
                      style={{ width: `${Math.min(dailyLimitPercent, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-ink-muted shrink-0 tabular-nums">
                    {dailyLimitPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Key numbers */}
            <div className="flex items-center gap-4 sm:gap-6 text-center sm:text-right shrink-0">
              <div>
                <span className="text-[10px] text-ink-muted font-semibold uppercase tracking-wider block">Spent Today</span>
                <span
                  className={`font-display font-bold text-sm ${
                    dailyExceeded ? 'text-coral' : dailyNearLimit ? 'text-honey font-extrabold' : 'text-ink'
                  }`}
                >
                  {formatCurrency(summary.today_spent || 0)}
                </span>
              </div>
              <div className="w-px h-8 bg-ink/8 dark:bg-white/10" />
              <div>
                <span className="text-[10px] text-ink-muted font-semibold uppercase tracking-wider block">Remaining</span>
                <span className={`font-display font-bold text-sm ${dailyRemaining === 0 ? 'text-coral' : 'text-sage'}`}>
                  {formatCurrency(dailyRemaining)}
                </span>
              </div>
              <div className="w-px h-8 bg-ink/8 dark:bg-white/10" />
              <div>
                <span className="text-[10px] text-ink-muted font-semibold uppercase tracking-wider block">Daily Cap</span>
                <span className="font-display font-bold text-sm text-ink">
                  {formatCurrency(summary.daily_limit)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* Bento Grid Layer 1: Budget Ring & Weekly/Monthly Category Pie Chart */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetRing
          limitAmount={summary?.budget_limit || 0}
          spentAmount={summary?.total_spent || 0}
          status={summary?.budget_status}
        />
        <CategoryDonutChart initialData={categorySpend} />
      </motion.div>

      {/* Bento Grid Layer 2: Spend Velocity Trend & Monthly Category Graph */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendTrendChart initialData={trendData} />
        <MonthlyCategoryGraph data={categorySpend} />
      </motion.div>

      {/* Bento Grid Layer 3: MoM Comparison, Budget Stats Report, & Top Categories */}
      <motion.div
        variants={itemVariants}
        className={`grid grid-cols-1 ${showPredictiveInsights ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-6`}
      >
        <MonthComparisonCard comparison={comparison} />
        {showPredictiveInsights && <MonthlyStatsReport summary={summary} topCategories={topCategories} />}
        <TopCategoriesWidget categories={topCategories} />
      </motion.div>

      {/* Bento Grid Layer 4: Recent Expenses Snapshot */}
      <motion.div variants={itemVariants}>
        <RecentExpensesSnapshot expenses={summary?.recent_expenses || []} />
      </motion.div>
    </motion.div>
  );
}
