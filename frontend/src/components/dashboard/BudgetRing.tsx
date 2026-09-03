'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useFormatCurrency } from '@/providers/CurrencyProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { AlertTriangle, CheckCircle, Flame, Target } from 'lucide-react';

interface BudgetRingProps {
  limitAmount: number;
  spentAmount: number;
  status?: 'on_track' | 'near_limit' | 'over_budget' | null;
}

export default function BudgetRing({
  limitAmount = 0,
  spentAmount = 0,
}: BudgetRingProps) {
  const formatCurrency = useFormatCurrency();
  const { nearLimitThreshold = 80 } = useSettings();

  const percentage =
    limitAmount > 0 ? Math.min(Math.round((spentAmount / limitAmount) * 100), 999) : 0;
  const strokeDashoffset = 283 - (283 * Math.min(percentage, 100)) / 100;

  const isOverBudget = percentage >= 100;
  const isNearLimit = percentage >= nearLimitThreshold && !isOverBudget;

  const getStatusBadge = () => {
    if (isOverBudget) {
      return (
        <span className="px-3 py-1 rounded-full bg-coral-light text-coral border border-coral/30 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
          <Flame className="w-3.5 h-3.5" /> Over Budget
        </span>
      );
    }
    if (isNearLimit) {
      return (
        <span className="px-3 py-1 rounded-full bg-honey-light text-honey border border-honey/30 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5" /> Near Limit (≥{nearLimitThreshold}%)
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full bg-sage-light text-sage border border-sage/30 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
        <CheckCircle className="w-3.5 h-3.5" /> On Track
      </span>
    );
  };

  const getRingColor = () => {
    if (isOverBudget) return '#C85A48';
    if (isNearLimit) return '#C68A28';
    return '#3E7259';
  };

  const remaining = limitAmount > 0 ? limitAmount - spentAmount : 0;

  return (
    <div className="glass-card glass-card-hover p-6 sm:p-7 flex flex-col justify-between h-full min-h-[380px] relative overflow-hidden border-sage/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sage/15 flex items-center justify-center text-sage">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Monthly Budget Status</h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">Master spending limit & real-time runway</p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Ring & Center Percentage Visual */}
      <div className="flex flex-col items-center justify-center my-auto py-3">
        <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
          {/* Subtle ambient backglow */}
          <div
            className="absolute inset-4 rounded-full blur-xl opacity-20 transition-all duration-700 pointer-events-none"
            style={{ backgroundColor: getRingColor() }}
          />

          <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 100 100">
            {/* Background Track Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              className="stroke-ink/5 dark:stroke-white/10"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Animated Progress Circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              stroke={getRingColor()}
              strokeWidth="7"
              strokeDasharray="283"
              initial={{ strokeDashoffset: 283 }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Percentage Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
            <span className="font-display font-extrabold text-3xl sm:text-4xl text-ink tracking-tight">
              {percentage}%
            </span>
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mt-0.5">
              Limit Used
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Stats Grid */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-4 border-t border-ink/5 dark:border-white/10">
        <div className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/5 dark:border-white/10 text-center">
          <span className="text-[10px] sm:text-[11px] text-ink-muted font-semibold uppercase tracking-wider block">
            Budget Cap
          </span>
          <span className="font-display font-bold text-sm sm:text-base text-ink block mt-0.5 truncate">
            {limitAmount > 0 ? formatCurrency(limitAmount) : 'None'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/5 dark:border-white/10 text-center">
          <span className="text-[10px] sm:text-[11px] text-ink-muted font-semibold uppercase tracking-wider block">
            Total Spent
          </span>
          <span className="font-display font-bold text-sm sm:text-base text-coral block mt-0.5 truncate">
            {formatCurrency(spentAmount)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/5 dark:border-white/10 text-center">
          <span className="text-[10px] sm:text-[11px] text-ink-muted font-semibold uppercase tracking-wider block">
            {remaining < 0 ? 'Deficit' : 'Remaining'}
          </span>
          <span
            className={`font-display font-bold text-sm sm:text-base block mt-0.5 truncate ${
              remaining < 0 ? 'text-coral font-extrabold' : 'text-sage'
            }`}
          >
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>
    </div>
  );
}
