'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  Target,
  Clock,
  Zap,
  CheckCircle2,
  TrendingDown,
  Info,
  Calendar,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { DashboardSummary } from '@/types';
import { useFormatCurrency } from '@/providers/CurrencyProvider';

interface VisualMoodWidgetProps {
  currencySymbol?: string;
  summary?: DashboardSummary;
}

type FinancialMood = 'thriving' | 'zen' | 'cautious' | 'distressed';

interface MoodConfig {
  id: FinancialMood;
  label: string;
  emoji: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  gradientBg: string;
  auraColor: string;
  statusTag: string;
  headline: string;
  description: string;
  proTip: string;
}

const MOOD_CONFIGS: Record<FinancialMood, MoodConfig> = {
  thriving: {
    id: 'thriving',
    label: 'Thriving',
    emoji: '🥳',
    badgeBg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    gradientBg: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    auraColor: 'rgba(16, 185, 129, 0.25)',
    statusTag: 'Peak Financial Health',
    headline: 'Finances are in high gear! 🥳',
    description: "Your spending pacing is frosty cool and well below the threshold. Excellent discipline!",
    proTip: 'Surplus room available. Great opportunity to boost savings or investments.',
  },
  zen: {
    id: 'zen',
    label: 'Zen',
    emoji: '🧘',
    badgeBg: 'bg-teal-500/15 dark:bg-teal-500/20',
    badgeText: 'text-teal-700 dark:text-teal-300',
    badgeBorder: 'border-teal-500/30',
    gradientBg: 'from-teal-500/10 via-cyan-500/5 to-transparent',
    auraColor: 'rgba(20, 184, 166, 0.25)',
    statusTag: 'Mindful & Balanced',
    headline: 'Inner peace & balance achieved 🧘',
    description: 'Spending velocity is steady and synchronized with the month calendar. No turbulence.',
    proTip: 'Keep this steady rhythm to finish the cycle with a comfortable cushion.',
  },
  cautious: {
    id: 'cautious',
    label: 'Cautious',
    emoji: '⚡',
    badgeBg: 'bg-amber-500/15 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-500/30',
    gradientBg: 'from-amber-500/10 via-orange-500/5 to-transparent',
    auraColor: 'rgba(245, 158, 11, 0.25)',
    statusTag: 'Pacing Alert (≥80%)',
    headline: 'Caution zone! Approaching limits ⚡',
    description: 'You have consumed over 80% of your allocated budget. Slow down on non-essential splurges.',
    proTip: 'Taper daily discretionary spending to maintain runway for the rest of the month.',
  },
  distressed: {
    id: 'distressed',
    label: 'Distressed',
    emoji: '😱',
    badgeBg: 'bg-rose-500/15 dark:bg-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-500/30',
    gradientBg: 'from-rose-500/10 via-red-500/5 to-transparent',
    auraColor: 'rgba(244, 63, 94, 0.3)',
    statusTag: 'Budget Breached',
    headline: 'Budget limit breached! 😱',
    description: 'Overall monthly spending has crossed 100% or daily caps are exceeded. Immediate pause advised.',
    proTip: 'Activate an essentials-only spending pause to halt further deficit accumulation.',
  },
};

const FUN_QUIPS = [
  "Hey! I'm Brainy, your budget mascot! Watching your wallet 24/7! 🧠✨",
  "Checking the ledger... all calculations verified! 📊",
  "Smart spenders build great futures! Keep pacing thoughtfully! 🚀",
  "Every rupee tracked is a rupee directed with purpose! 💡",
];

export default function VisualMoodWidget({ currencySymbol = '₹', summary: initialSummary }: VisualMoodWidgetProps) {
  const formatCurrency = useFormatCurrency();
  const [pokeCount, setPokeCount] = useState(0);
  const [showQuip, setShowQuip] = useState(false);
  const [customQuipIndex, setCustomQuipIndex] = useState(0);

  // Fetch or use summary
  const { data: fetchedSummary, isFetching, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: dashboardApi.getSummary,
    enabled: !initialSummary,
    staleTime: 60 * 1000,
  });

  const summary = initialSummary || fetchedSummary;

  // Compute month metrics
  const {
    totalSpent,
    budgetLimit,
    remaining,
    dailyLimit,
    todaySpent,
    percentageSpent,
    dailyPercentage,
    daysRemaining,
    safeDailySpend,
    financialMood,
  } = useMemo(() => {
    const total = summary?.total_spent || 0;
    const limit = summary?.budget_limit || 0;
    const rem = summary?.budget_remaining ?? (limit > 0 ? limit - total : 0);
    const dLimit = summary?.daily_limit || 0;
    const tSpent = summary?.today_spent || 0;

    const pct = limit > 0 ? (total / limit) * 100 : 0;
    const dPct = dLimit > 0 ? (tSpent / dLimit) * 100 : 0;

    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(daysInMonth - currentDay, 1);
    const safeDaily = limit > 0 ? Math.max(rem, 0) / daysLeft : 0;

    let mood: FinancialMood = 'thriving';
    if ((limit > 0 && total > limit) || rem < 0 || (dLimit > 0 && tSpent > dLimit)) {
      mood = 'distressed';
    } else if (pct >= 80 || dPct >= 80) {
      mood = 'cautious';
    } else if (pct >= 60) {
      mood = 'zen';
    } else {
      mood = 'thriving';
    }

    return {
      totalSpent: total,
      budgetLimit: limit,
      remaining: rem,
      dailyLimit: dLimit,
      todaySpent: tSpent,
      percentageSpent: pct,
      dailyPercentage: dPct,
      daysRemaining: daysLeft,
      safeDailySpend: safeDaily,
      financialMood: mood,
    };
  }, [summary]);

  const moodConfig = MOOD_CONFIGS[financialMood];

  const handleMascotClick = () => {
    setPokeCount((prev) => prev + 1);
    setCustomQuipIndex((prev) => (prev + 1) % FUN_QUIPS.length);
    setShowQuip(true);
    setTimeout(() => setShowQuip(false), 3800);
  };

  return (
    <div
      className={`glass-card p-5 sm:p-6 border-ink/10 dark:border-white/10 bg-gradient-to-br ${moodConfig.gradientBg} relative overflow-hidden transition-all duration-500`}
    >
      {/* Background Radial Glow */}
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-60"
        style={{ backgroundColor: moodConfig.auraColor }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ink/5 dark:border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-white/10 border border-ink/10 dark:border-white/10 flex items-center justify-center text-xl shadow-xs">
            <span>{moodConfig.emoji}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-bold text-lg text-ink">Visual Mood & Financial Vibe</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border uppercase tracking-wider flex items-center gap-1 shadow-xs ${moodConfig.badgeBg} ${moodConfig.badgeText} ${moodConfig.badgeBorder}`}
              >
                <span>{moodConfig.emoji}</span>
                <span>{moodConfig.label}</span>
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Real-time psychological financial status derived from live monthly velocity & daily pacing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-ink/10 dark:border-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Financial Mood"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs font-semibold text-ink-muted">
            Status: <strong className="text-ink">{moodConfig.statusTag}</strong>
          </span>
        </div>
      </div>

      {/* Main Mascot & Mood Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-5 items-center relative z-10">
        {/* Left: Animated Mascot Stage (md: 4 cols) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-ink/5 dark:border-white/10 relative">
          {/* Interactive Mascot Speech Bubble */}
          <AnimatePresence mode="wait">
            <motion.div
              key={showQuip ? `quip-${customQuipIndex}` : `mood-${financialMood}`}
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-3 px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-ink/10 dark:border-white/10 shadow-sm text-left max-w-xs relative cursor-pointer"
              onClick={handleMascotClick}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3 h-3 text-sage" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                  Brainy Mascot Vibe
                </span>
              </div>
              <p className="text-xs text-ink font-medium leading-snug">
                {showQuip ? FUN_QUIPS[customQuipIndex] : moodConfig.headline}
              </p>
              {/* Triangle Tail */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-black/40 border-r border-b border-ink/10 dark:border-white/10 rotate-45" />
            </motion.div>
          </AnimatePresence>

          {/* SVG Animated Mascot Character */}
          <motion.div
            onClick={handleMascotClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            animate={
              financialMood === 'thriving'
                ? { y: [0, -8, 0, -4, 0], rotate: [-1, 1.5, -1, 1, 0] }
                : financialMood === 'zen'
                ? { y: [0, -5, 0], scale: [1, 1.02, 1] }
                : financialMood === 'cautious'
                ? { y: [0, -3, 0], rotate: [0, 1, -1, 0] }
                : { x: [-2, 2, -2, 2, 0], y: [0, -2, 0] }
            }
            transition={{
              duration: financialMood === 'thriving' ? 2.5 : financialMood === 'zen' ? 3.5 : financialMood === 'cautious' ? 2 : 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-28 h-28 sm:w-32 sm:h-32 relative cursor-pointer select-none filter drop-shadow-md"
            title="Click to interact with Brainy!"
          >
            <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
              <defs>
                {/* Mascot Body Gradient */}
                <linearGradient id="mascotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3E7259" />
                  <stop offset="100%" stopColor="#254637" />
                </linearGradient>
                {/* Glow Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Aura Halo Ring */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={moodConfig.auraColor}
                strokeWidth="3"
                strokeDasharray="6 4"
                className="animate-spin-slow opacity-80"
              />

              {/* Antenna */}
              <line x1="60" y1="26" x2="60" y2="12" stroke="#3E7259" strokeWidth="3" strokeLinecap="round" />
              <circle
                cx="60"
                cy="10"
                r="5"
                fill={
                  financialMood === 'distressed'
                    ? '#F43F5E'
                    : financialMood === 'cautious'
                    ? '#F59E0B'
                    : '#10B981'
                }
                filter="url(#glow)"
              />

              {/* Mascot Body (Cute Brain Robot) */}
              <rect x="22" y="24" width="76" height="68" rx="34" fill="url(#mascotGrad)" />
              {/* Visor / Face Screen */}
              <rect
                x="28"
                y="32"
                width="64"
                height="48"
                rx="22"
                fill="#0F1713"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.5"
              />

              {/* Mascot Expressions based on mood */}
              {financialMood === 'thriving' && (
                <g>
                  {/* Happy Curved Eyes (Joyful Arches) */}
                  <path d="M 40 48 Q 46 41 52 48" stroke="#10B981" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  <path d="M 68 48 Q 74 41 80 48" stroke="#10B981" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  {/* Rosy Cheeks */}
                  <circle cx="36" cy="56" r="3" fill="#F43F5E" opacity="0.6" />
                  <circle cx="84" cy="56" r="3" fill="#F43F5E" opacity="0.6" />
                  {/* Big Smile */}
                  <path d="M 50 58 Q 60 67 70 58" stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round" />
                  {/* Confetti / Sparkle */}
                  <circle cx="14" cy="28" r="2" fill="#FBBF24" />
                  <circle cx="106" cy="34" r="2.5" fill="#34D399" />
                  <polygon points="102,20 105,26 99,26" fill="#F43F5E" />
                </g>
              )}

              {financialMood === 'zen' && (
                <g>
                  {/* Zen Meditating Closed Eyes */}
                  <path d="M 40 48 Q 46 54 52 48" stroke="#2DD4BF" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  <path d="M 68 48 Q 74 54 80 48" stroke="#2DD4BF" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  {/* Peaceful Calm Mouth */}
                  <path d="M 52 59 Q 60 63 68 59" stroke="#2DD4BF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  {/* Lotus Glow Rings under body */}
                  <ellipse cx="60" cy="98" rx="28" ry="5" fill="#14B8A6" opacity="0.3" />
                </g>
              )}

              {financialMood === 'cautious' && (
                <g>
                  {/* Watchful Inquisitive Eyes */}
                  <circle cx="46" cy="49" r="5" fill="#F59E0B" />
                  <circle cx="74" cy="49" r="5" fill="#F59E0B" />
                  <circle cx="48" cy="48" r="2" fill="#FFFFFF" />
                  <circle cx="76" cy="48" r="2" fill="#FFFFFF" />
                  {/* Straight Taut Mouth */}
                  <line x1="52" y1="61" x2="68" y2="61" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Caution Sweat Drop */}
                  <path d="M 88 40 Q 92 48 88 52 Q 84 48 88 40" fill="#60A5FA" opacity="0.8" />
                </g>
              )}

              {financialMood === 'distressed' && (
                <g>
                  {/* Shocked Large Round Eyes */}
                  <circle cx="45" cy="48" r="7" fill="#F43F5E" />
                  <circle cx="75" cy="48" r="7" fill="#F43F5E" />
                  <circle cx="45" cy="48" r="3" fill="#FFFFFF" />
                  <circle cx="75" cy="48" r="3" fill="#FFFFFF" />
                  {/* Alarmed Open Gasp Mouth */}
                  <ellipse cx="60" cy="63" rx="6" ry="7" fill="#F43F5E" />
                  {/* Panic Zig-Zag Marks */}
                  <path d="M 32 30 L 36 34 L 32 38" stroke="#F43F5E" strokeWidth="2" fill="none" />
                  <path d="M 88 30 L 84 34 L 88 38" stroke="#F43F5E" strokeWidth="2" fill="none" />
                </g>
              )}

              {/* Mascot Cute Feet */}
              <ellipse cx="44" cy="94" rx="8" ry="4" fill="#254637" />
              <ellipse cx="76" cy="94" rx="8" ry="4" fill="#254637" />
            </svg>
          </motion.div>

          {/* Interactive Poke Label */}
          <button
            type="button"
            onClick={handleMascotClick}
            className="mt-2 text-[10px] font-semibold text-ink-muted hover:text-ink transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-sage" />
            <span>Tap Brainy to interact</span>
            {pokeCount > 0 && <span className="opacity-70">({pokeCount})</span>}
          </button>
        </div>

        {/* Right: Mood Meter, Status, & Pacing Insights (md: 8 cols) */}
        <div className="md:col-span-8 space-y-4">
          {/* Mood Headline & Description */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{moodConfig.emoji}</span>
              <h3 className="font-display font-extrabold text-base sm:text-lg text-ink">
                Financial Mood: {moodConfig.label}
              </h3>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              {moodConfig.description}
            </p>
          </div>

          {/* 4-Zone Visual Mood Speedometer / Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-ink flex items-center gap-1">
                <span>Budget Velocity Meter</span>
                <span className="text-ink-muted font-normal">({percentageSpent.toFixed(1)}% consumed)</span>
              </span>
              <span className="font-extrabold text-ink">
                {budgetLimit > 0
                  ? `${formatCurrency(totalSpent)} of ${formatCurrency(budgetLimit)}`
                  : `${formatCurrency(totalSpent)} spent`}
              </span>
            </div>

            {/* Segmented Track with pointer */}
            <div className="relative pt-2 pb-1">
              {/* Needle Indicator */}
              <motion.div
                initial={{ left: '0%' }}
                animate={{ left: `${Math.min(Math.max(percentageSpent, 2), 98)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20"
              >
                <span className="text-xs">{moodConfig.emoji}</span>
                <div className="w-0.5 h-2.5 bg-ink dark:bg-white" />
              </motion.div>

              {/* Zone Track */}
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-ink/10 dark:bg-white/10 p-0.5 gap-0.5">
                {/* Zone 1: Thriving (0 - 59%) */}
                <div
                  className={`h-full rounded-l-full bg-emerald-500 transition-all ${
                    financialMood === 'thriving' ? 'opacity-100 ring-2 ring-emerald-400' : 'opacity-40'
                  }`}
                  style={{ width: '60%' }}
                  title="0% - 59%: 🥳 Thriving Zone"
                />
                {/* Zone 2: Zen (60 - 79%) */}
                <div
                  className={`h-full bg-teal-400 transition-all ${
                    financialMood === 'zen' ? 'opacity-100 ring-2 ring-teal-300' : 'opacity-40'
                  }`}
                  style={{ width: '20%' }}
                  title="60% - 79%: 🧘 Zen Zone"
                />
                {/* Zone 3: Cautious (80 - 99%) */}
                <div
                  className={`h-full bg-amber-400 transition-all ${
                    financialMood === 'cautious' ? 'opacity-100 ring-2 ring-amber-300' : 'opacity-40'
                  }`}
                  style={{ width: '15%' }}
                  title="80% - 99%: ⚡ Cautious Zone"
                />
                {/* Zone 4: Distressed (100%+) */}
                <div
                  className={`h-full rounded-r-full bg-rose-500 transition-all ${
                    financialMood === 'distressed' ? 'opacity-100 ring-2 ring-rose-400' : 'opacity-40'
                  }`}
                  style={{ width: '5%' }}
                  title="100%+: 😱 Distressed Zone"
                />
              </div>

              {/* Track Scale Labels */}
              <div className="flex items-center justify-between text-[10px] text-ink-muted mt-1 px-1 font-medium">
                <span className="text-emerald-600 dark:text-emerald-400">🥳 0% Thriving</span>
                <span className="text-teal-600 dark:text-teal-400">🧘 60% Zen</span>
                <span className="text-amber-600 dark:text-amber-400">⚡ 80% Caution</span>
                <span className="text-rose-600 dark:text-rose-400">😱 100% Breached</span>
              </div>
            </div>
          </div>

          {/* Key Metrics Quick Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Safe Daily Allowance */}
            <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-ink/5 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] text-ink-muted font-semibold uppercase tracking-wider">
                <Clock className="w-3 h-3 text-sage" />
                <span>Safe Run Rate</span>
              </div>
              <span className="font-display font-extrabold text-sm sm:text-base text-ink block mt-0.5">
                {budgetLimit > 0 ? `${formatCurrency(safeDailySpend)}/day` : 'Set Budget'}
              </span>
              <span className="text-[10px] text-ink-muted">for {daysRemaining} days left</span>
            </div>

            {/* Remaining Balance / Deficit */}
            <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-ink/5 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] text-ink-muted font-semibold uppercase tracking-wider">
                <Target className="w-3 h-3 text-sage" />
                <span>{remaining < 0 ? 'Deficit' : 'Remaining'}</span>
              </div>
              <span
                className={`font-display font-extrabold text-sm sm:text-base block mt-0.5 ${
                  remaining < 0 ? 'text-coral' : 'text-sage'
                }`}
              >
                {budgetLimit > 0 ? formatCurrency(remaining) : 'No Cap'}
              </span>
              <span className="text-[10px] text-ink-muted">
                {budgetLimit > 0 ? `${(100 - percentageSpent).toFixed(0)}% cushion` : 'Unrestricted'}
              </span>
            </div>

            {/* Daily Limit Status */}
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-ink/5 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] text-ink-muted font-semibold uppercase tracking-wider">
                <Zap className="w-3 h-3 text-sage" />
                <span>Today's Spend</span>
              </div>
              <span className="font-display font-extrabold text-sm sm:text-base text-ink block mt-0.5">
                {formatCurrency(todaySpent)}
              </span>
              <span className="text-[10px] text-ink-muted">
                {dailyLimit > 0 ? `Cap: ${formatCurrency(dailyLimit)}` : 'No daily cap'}
              </span>
            </div>
          </div>

          {/* Actionable Pro-Tip Callout */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-black/20 border border-ink/5 dark:border-white/10 flex items-start gap-2.5 text-xs">
            <span className="text-base shrink-0 leading-none mt-0.5">{moodConfig.emoji}</span>
            <div className="min-w-0">
              <strong className="text-ink font-semibold mr-1">Mascot Recommendation:</strong>
              <span className="text-ink-muted leading-relaxed">{moodConfig.proTip}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
