'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../lib/utils';
import { AlertTriangle, CheckCircle, Flame, Target } from 'lucide-react';

interface BudgetRingProps {
  limitAmount: number;
  spentAmount: number;
  status?: 'on_track' | 'near_limit' | 'over_budget' | null;
}

export default function BudgetRing({
  limitAmount = 0,
  spentAmount = 0,
  status = 'on_track',
}: BudgetRingProps) {
  const percentage =
    limitAmount > 0 ? Math.min(Math.round((spentAmount / limitAmount) * 100), 999) : 0;
  const strokeDashoffset = 283 - (283 * Math.min(percentage, 100)) / 100;

  const getStatusBadge = () => {
    if (status === 'over_budget' || percentage >= 100) {
      return (
        <span className="px-3 py-1 rounded-full bg-coral-light text-coral border border-coral/30 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
          <Flame className="w-3.5 h-3.5" /> Over Budget
        </span>
      );
    }
    if (status === 'near_limit' || percentage >= 80) {
      return (
        <span className="px-3 py-1 rounded-full bg-honey-light text-honey border border-honey/30 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5" /> Near Limit (≥80%)
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
    if (status === 'over_budget' || percentage >= 100) return '#D96B50';
    if (status === 'near_limit' || percentage >= 80) return '#D99B38';
    return '#4E8D6E';
  };

  return (
    <div className="glass-card glass-card-hover p-6 flex flex-col justify-between h-full min-h-[340px] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Monthly Budget Status</h3>
          <p className="text-xs text-ink-muted">Master Spending Limit Tracker</p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Ring & Data Section */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-auto">
        {/* SVG Circular Progress Ring */}
        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Track Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              className="stroke-ink/5 dark:stroke-white/10"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Animated Progress Circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              stroke={getRingColor()}
              strokeWidth="8"
              strokeDasharray="283"
              initial={{ strokeDashoffset: 283 }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Percentage Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display font-extrabold text-3xl text-ink tracking-tight">
              {percentage}%
            </span>
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mt-0.5">
              Limit Used
            </span>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="space-y-3 w-full sm:w-auto">
          <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/5 border border-ink/5 dark:border-white/10">
            <span className="text-[11px] text-ink-muted font-medium block">Monthly Limit Target</span>
            <span className="font-display font-bold text-lg text-ink">
              {limitAmount > 0 ? formatCurrency(limitAmount) : 'Not Configured'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/5 border border-ink/5 dark:border-white/10">
            <span className="text-[11px] text-ink-muted font-medium block">Total Spent So Far</span>
            <span className="font-display font-bold text-lg text-coral">
              {formatCurrency(spentAmount)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/5 border border-ink/5 dark:border-white/10">
            <span className="text-[11px] text-ink-muted font-medium block">Remaining Limit</span>
            <span className="font-display font-bold text-lg text-sage">
              {formatCurrency(Math.max(limitAmount - spentAmount, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
