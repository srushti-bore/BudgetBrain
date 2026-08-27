'use client';

import React from 'react';
import { useFormatCurrency } from '@/providers/CurrencyProvider';
import { Sparkles, TrendingUp, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { DashboardSummary, TopCategory } from '@/types';

interface MonthlyStatsReportProps {
  summary: DashboardSummary | null;
  topCategories: TopCategory[];
}

export default function MonthlyStatsReport({ summary, topCategories }: MonthlyStatsReportProps) {
  const formatCurrency = useFormatCurrency();

  if (!summary) {
    return (
      <div className="glass-card p-7 min-h-[220px] flex items-center justify-center text-xs text-ink-muted">
        Loading statistics...
      </div>
    );
  }

  const elapsedDays = new Date().getDate();
  const totalDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  
  const totalSpent = summary.total_spent || 0;
  const avgDaily = elapsedDays > 0 ? totalSpent / elapsedDays : 0;
  const projectedSpent = avgDaily * totalDays;
  const limitAmount = summary.budget_limit || 0;

  // Calculate Health Index
  let healthStatus = 'Healthy';
  let healthColor = 'text-sage bg-sage-light border-sage/20 dark:bg-sage/10 dark:text-sage';
  let HealthIcon = ShieldCheck;
  let healthTip = 'Your projected spending is well within your monthly limit. Keep it up!';

  if (limitAmount > 0) {
    const ratio = projectedSpent / limitAmount;
    if (ratio > 1.2) {
      healthStatus = 'Critical';
      healthColor = 'text-coral bg-coral-light border-coral/30 dark:bg-coral/10 dark:text-coral';
      HealthIcon = AlertTriangle;
      healthTip = 'Alert: Projected monthly spend exceeds your budget limit by over 20%. Consider reducing non-essential expenses.';
    } else if (ratio > 1.0) {
      healthStatus = 'At Risk';
      healthColor = 'text-honey bg-honey-light border-honey/20 dark:bg-honey/10 dark:text-honey';
      HealthIcon = AlertTriangle;
      healthTip = 'Warning: You are projected to slightly exceed your budget by the end of the month.';
    }
  } else {
    healthStatus = 'Unmonitored';
    healthColor = 'text-ink-muted bg-ink/5 border-ink/10 dark:bg-white/5 dark:border-white/10';
    HealthIcon = HelpCircle;
    healthTip = 'Tip: Set a monthly budget limit under Budget Goals to track your financial health score!';
  }

  const highestCat = topCategories[0];

  return (
    <div className="glass-card glass-card-hover p-7 flex flex-col justify-between h-full space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Budget Stats & Projections</h3>
            <p className="text-xs text-ink-muted">Predictive monthly insights and advice</p>
          </div>
          <Sparkles className="w-5 h-5 text-honey animate-pulse" />
        </div>

        {/* Projections Grid */}
        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="bg-cream/40 dark:bg-white/5 p-3 rounded-xl border border-ink/5 dark:border-white/10">
            <span className="text-[10px] text-ink-muted font-bold uppercase tracking-wider block">Avg. Daily Spend</span>
            <span className="font-display font-bold text-base text-ink block mt-0.5">
              {formatCurrency(avgDaily)}
            </span>
          </div>
          <div className="bg-cream/40 dark:bg-white/5 p-3 rounded-xl border border-ink/5 dark:border-white/10">
            <span className="text-[10px] text-ink-muted font-bold uppercase tracking-wider block">Projected Total</span>
            <span className="font-display font-bold text-base text-ink block mt-0.5">
              {formatCurrency(projectedSpent)}
            </span>
          </div>
        </div>

        {/* Health Index status bar */}
        <div className={`mt-4 p-3 rounded-xl border flex items-start gap-2.5 ${healthColor}`}>
          <HealthIcon className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-bold block leading-none">Health Rating: {healthStatus}</span>
            <span className="text-[10px] block mt-1.5 leading-normal">{healthTip}</span>
          </div>
        </div>
      </div>

      {highestCat && (
        <div className="border-t border-ink/5 dark:border-white/10 pt-3 flex items-center justify-between text-xs">
          <span className="text-ink-muted">Main Expense Driver:</span>
          <span className="font-semibold text-coral bg-coral-light/30 dark:bg-coral-light/10 px-2 py-0.5 rounded border border-coral/20">
            {highestCat.category_name} ({formatCurrency(highestCat.total_spent)})
          </span>
        </div>
      )}
    </div>
  );
}
