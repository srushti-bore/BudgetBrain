'use client';

import React from 'react';
import { MonthComparison } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface MonthComparisonCardProps {
  comparison: MonthComparison | null;
}

export default function MonthComparisonCard({ comparison }: MonthComparisonCardProps) {
  if (!comparison) {
    return (
      <div className="glass-card glass-card-hover p-8 flex flex-col justify-between h-full min-h-[180px]">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Month-over-Month Comparison</h3>
          <p className="text-xs text-ink-muted">Spend delta vs last month</p>
        </div>
        <p className="text-xs text-ink-muted my-auto">Loading comparison insights...</p>
      </div>
    );
  }

  const { current_month_spent, previous_month_spent, percentage_change, is_increase } = comparison;

  return (
    <div className="glass-card glass-card-hover p-8 flex flex-col justify-between h-full min-h-[180px]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Month-over-Month</h3>
          <p className="text-xs text-ink-muted">Compared to previous month</p>
        </div>

        {/* Change Badge */}
        {percentage_change !== null ? (
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border shadow-2xs ${
              is_increase
                ? 'bg-coral-light text-coral border-coral/30'
                : 'bg-sage-light text-sage border-sage/30'
            }`}
          >
            {is_increase ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>
              {is_increase ? '+' : '-'}
              {Math.abs(percentage_change)}%
            </span>
          </div>
        ) : (
          <div className="px-3 py-1 rounded-full bg-ink/5 dark:bg-white/10 text-ink-muted text-xs font-medium flex items-center gap-1">
            <Minus className="w-3.5 h-3.5" /> First Month
          </div>
        )}
      </div>

      {/* Figures Comparison */}
      <div className="grid grid-cols-2 gap-4 my-auto pt-4 border-t border-ink/5 dark:border-white/10">
        <div>
          <span className="text-xs text-ink-muted font-medium block">Current Month</span>
          <span className="font-display font-extrabold text-xl text-ink">
            {formatCurrency(current_month_spent)}
          </span>
        </div>

        <div>
          <span className="text-xs text-ink-muted font-medium block">Previous Month</span>
          <span className="font-display font-bold text-xl text-ink-muted">
            {formatCurrency(previous_month_spent)}
          </span>
        </div>
      </div>
    </div>
  );
}
