'use client';

import React from 'react';
import { MonthComparison } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface MonthComparisonCardProps {
  comparison: MonthComparison | null;
}

export default function MonthComparisonCard({ comparison }: MonthComparisonCardProps) {
  if (!comparison) return null;

  const { current_month_spent, previous_month_spent, percentage_change, is_increase } = comparison;

  return (
    <div className="glass-card p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
          Month-over-Month
        </span>
        {percentage_change !== null ? (
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              is_increase
                ? 'bg-coral-light text-coral border border-coral/30'
                : 'bg-sage-light text-sage border border-sage/30'
            }`}
          >
            {is_increase ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{Math.abs(percentage_change)}% {is_increase ? 'Increase' : 'Decrease'}</span>
          </div>
        ) : (
          <div className="px-2 py-0.5 rounded-full bg-ink/5 text-ink-muted text-xs font-medium flex items-center gap-1">
            <Minus className="w-3 h-3" />
            <span>No Prev Month Data</span>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-ink/5">
        <div>
          <span className="text-[11px] text-ink-muted block font-medium">This Month</span>
          <span className="font-display font-extrabold text-lg text-ink block">
            {formatCurrency(current_month_spent)}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-ink-muted block font-medium">Last Month</span>
          <span className="font-display font-bold text-lg text-ink-muted block">
            {formatCurrency(previous_month_spent)}
          </span>
        </div>
      </div>
    </div>
  );
}
