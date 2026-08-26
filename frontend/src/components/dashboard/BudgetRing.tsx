'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Flame, Target } from 'lucide-react';

interface BudgetRingProps {
  limitAmount: number;
  spentAmount: number;
  status?: 'on_track' | 'near_limit' | 'over_budget' | null;
}

export default function BudgetRing({ limitAmount, spentAmount, status: backendStatus }: BudgetRingProps) {
  if (!limitAmount || limitAmount <= 0) {
    return (
      <div className="glass-card glass-card-hover p-6 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <div className="w-14 h-14 rounded-2xl bg-honey/15 flex items-center justify-center text-honey mb-4">
          <Target className="w-7 h-7" />
        </div>
        <h3 className="font-display font-bold text-lg text-ink mb-1">No Budget Goal Set</h3>
        <p className="text-xs text-ink-muted max-w-xs mb-4">
          Set an overall monthly spending limit to activate live budget status tracking.
        </p>
        <a
          href="/budgets"
          className="px-4 py-2 bg-sage text-white text-xs font-semibold rounded-xl shadow-md hover:bg-sage/90 transition-colors"
        >
          Set Monthly Limit
        </a>
      </div>
    );
  }

  const percentage = limitAmount > 0 ? Math.min(Math.round((spentAmount / limitAmount) * 100), 999) : 0;
  const remainingAmount = Math.max(limitAmount - spentAmount, 0);

  // Status computation
  let statusText = 'On Track';
  let badgeColor = 'bg-sage-light text-sage border-sage/30';
  let StatusIcon = CheckCircle;

  if (backendStatus === 'over_budget' || percentage >= 100) {
    badgeColor = 'bg-coral-light text-coral border-coral/30';
    statusText = 'Over Budget';
    StatusIcon = Flame;
  } else if (backendStatus === 'near_limit' || percentage >= 80) {
    badgeColor = 'bg-honey-light text-honey border-honey/30';
    statusText = 'Near Limit';
    StatusIcon = AlertTriangle;
  }

  // SVG Ring Calculations
  const radius = 72;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.min(percentage, 100);
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div className="glass-card glass-card-hover p-6 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Monthly Budget</h3>
          <p className="text-xs text-ink-muted">Live Goal Tracking</p>
        </div>
        <div className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${badgeColor}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Signature Circular Budget Ring */}
      <div className="relative flex items-center justify-center my-2">
        <svg className="w-48 h-48 transform -rotate-90">
          <defs>
            <linearGradient id="budgetRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7FB89A" />
              <stop offset="50%" stopColor="#F4B860" />
              <stop offset="100%" stopColor="#F0876B" />
            </linearGradient>
          </defs>
          {/* Background Circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-ink/5"
            fill="transparent"
          />
          {/* Dynamic Animated Progress Circle */}
          <motion.circle
            cx="96"
            cy="96"
            r={radius}
            stroke="url(#budgetRingGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Ring Information */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="font-display font-extrabold text-3xl text-ink leading-none"
          >
            {percentage}%
          </motion.span>
          <span className="text-[11px] font-semibold text-ink-muted mt-1 uppercase tracking-wider">
            Spent
          </span>
        </div>
      </div>

      {/* Ring Details */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-ink/5 text-center">
        <div className="bg-white/50 p-2.5 rounded-xl border border-ink/5">
          <span className="text-[10px] text-ink-muted block font-medium">Spent / Goal</span>
          <span className="font-semibold text-xs text-ink truncate block">
            {formatCurrency(spentAmount)} / {formatCurrency(limitAmount)}
          </span>
        </div>
        <div className="bg-white/50 p-2.5 rounded-xl border border-ink/5">
          <span className="text-[10px] text-ink-muted block font-medium">Remaining</span>
          <span className="font-semibold text-xs text-sage truncate block">
            {formatCurrency(remainingAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
