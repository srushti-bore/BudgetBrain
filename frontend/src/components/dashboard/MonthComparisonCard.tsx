'use client';

import React from 'react';
import { MonthComparison } from '@/types';
import { useFormatCurrency } from '@/providers/CurrencyProvider';
import { TrendingDown, TrendingUp, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MonthComparisonCardProps {
  comparison: MonthComparison | null;
}

export default function MonthComparisonCard({ comparison }: MonthComparisonCardProps) {
  const formatCurrency = useFormatCurrency();

  if (!comparison) {
    return (
      <div className="glass-card glass-card-hover p-6 sm:p-7 flex flex-col justify-between h-full min-h-[190px] border-sage/20">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Month-over-Month</h3>
          <p className="text-xs text-ink-muted">Comparing to previous month</p>
        </div>
        <p className="text-xs text-ink-muted my-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sage animate-ping" />
          Loading comparison data...
        </p>
      </div>
    );
  }

  const currSpent = Number(comparison.current_month_total ?? comparison.current_month_spent ?? 0);
  const prevSpent = Number(comparison.previous_month_total ?? comparison.previous_month_spent ?? 0);
  const diff = Number(comparison.difference ?? (currSpent - prevSpent));
  const isIncrease = comparison.is_increase !== undefined ? comparison.is_increase : diff > 0;
  const isZeroChange = diff === 0;

  // Percentage change calculation with fallback
  let pctChange: number | null = comparison.percentage_change;
  if (pctChange === null || pctChange === undefined) {
    if (prevSpent > 0) {
      pctChange = Math.round(((currSpent - prevSpent) / prevSpent) * 100);
    } else if (currSpent > 0) {
      pctChange = 100;
    } else {
      pctChange = 0;
    }
  }

  const isFirstMonth = prevSpent === 0 && currSpent > 0;

  return (
    <div className="glass-card glass-card-hover p-6 sm:p-7 flex flex-col justify-between h-full min-h-[190px] border-sage/20">
      {/* Header & Change Badge */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Month-over-Month</h3>
          <p className="text-xs text-ink-muted mt-0.5">Spend delta vs last month</p>
        </div>

        {/* Change Badge */}
        {isFirstMonth ? (
          <div className="px-2.5 py-1 rounded-full bg-sage-light text-sage border border-sage/30 text-xs font-bold flex items-center gap-1 shadow-2xs">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Initial Baseline</span>
          </div>
        ) : isZeroChange ? (
          <div className="px-2.5 py-1 rounded-full bg-ink/5 dark:bg-white/10 text-ink-muted text-xs font-bold flex items-center gap-1">
            <Minus className="w-3.5 h-3.5" />
            <span>0% change</span>
          </div>
        ) : (
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border shadow-2xs ${
              isIncrease
                ? 'bg-coral-light text-coral border-coral/30 dark:bg-coral/15'
                : 'bg-sage-light text-sage border-sage/30 dark:bg-sage/15'
            }`}
          >
            {isIncrease ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>
              {isIncrease ? '+' : '-'}
              {Math.abs(Math.round(pctChange))}%
            </span>
          </div>
        )}
      </div>

      {/* Figures Comparison Grid */}
      <div className="grid grid-cols-2 gap-4 my-auto pt-4 border-t border-ink/5 dark:border-white/10">
        <div className="p-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-ink/5 dark:border-white/10">
          <span className="text-[10px] sm:text-[11px] text-ink-muted font-bold uppercase tracking-wider block">
            Current Month
          </span>
          <span className="font-display font-extrabold text-base sm:text-lg text-ink block mt-0.5 truncate">
            {formatCurrency(currSpent)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-ink/5 dark:border-white/10">
          <span className="text-[10px] sm:text-[11px] text-ink-muted font-bold uppercase tracking-wider block">
            Previous Month
          </span>
          <span className="font-display font-bold text-base sm:text-lg text-ink-muted block mt-0.5 truncate">
            {formatCurrency(prevSpent)}
          </span>
        </div>
      </div>
    </div>
  );
}
