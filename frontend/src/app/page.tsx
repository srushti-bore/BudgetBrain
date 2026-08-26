'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, Variants } from 'framer-motion';
import { dashboardApi } from '@/lib/api';
import BudgetRing from '@/components/dashboard/BudgetRing';
import CategoryDonutChart from '@/components/dashboard/CategoryDonutChart';
import SpendTrendChart from '@/components/dashboard/SpendTrendChart';
import MonthlyCategoryGraph from '@/components/dashboard/MonthlyCategoryGraph';
import MonthComparisonCard from '@/components/dashboard/MonthComparisonCard';
import TopCategoriesWidget from '@/components/dashboard/TopCategoriesWidget';
import RecentExpensesSnapshot from '@/components/dashboard/RecentExpensesSnapshot';
import { formatCurrency } from '@/lib/utils';
import { Wallet, Calendar, PlusCircle, AlertCircle } from 'lucide-react';
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
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function DashboardPage() {
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
        <p className="text-xs text-ink-muted mb-4">
          Unable to connect to FastAPI backend at <code className="bg-ink/5 px-1.5 py-0.5 rounded">http://localhost:8000/api/v1</code>.
        </p>
        <button
          onClick={() => refetchSummary()}
          className="px-4 py-2 bg-sage hover:bg-[#3E7259] text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto pb-12"
    >
      {/* Dashboard Top Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-0.5">
            Log expense → See impact → Track remaining budget
          </p>
        </div>

        <Link
          href="/expenses?action=new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-[#3E7259] text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-sage/20 transition-all self-start md:self-auto hover:scale-102 active:scale-98"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Log Expense</span>
        </Link>
      </motion.div>

      {/* Top Metrics Banner */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card glass-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sage-light flex items-center justify-center text-sage shrink-0 border border-sage/30">
            <Calendar className="w-6 h-6 text-ink font-bold" />
          </div>
          <div>
            <span className="text-xs text-ink-muted font-medium block">Current Month Spend</span>
            <span className="font-display font-extrabold text-2xl text-ink block">
              {formatCurrency(summary?.total_spent)}
            </span>
          </div>
        </div>

        <div className="glass-card glass-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-light flex items-center justify-center text-sky shrink-0 border border-sky/30">
            <Wallet className="w-6 h-6 text-ink font-bold" />
          </div>
          <div>
            <span className="text-xs text-ink-muted font-medium block">Total Transactions</span>
            <span className="font-display font-extrabold text-2xl text-ink block">
              {summary?.expense_count ?? 0} logged
            </span>
          </div>
        </div>
      </motion.div>

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

      {/* Bento Grid Layer 3: MoM Comparison & Top Categories */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MonthComparisonCard comparison={comparison} />
        <TopCategoriesWidget categories={topCategories} />
      </motion.div>

      {/* Bento Grid Layer 4: Recent Expenses Snapshot */}
      <motion.div variants={itemVariants}>
        <RecentExpensesSnapshot expenses={summary?.recent_expenses || []} />
      </motion.div>
    </motion.div>
  );
}
