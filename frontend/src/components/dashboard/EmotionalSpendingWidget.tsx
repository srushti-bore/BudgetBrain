'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Heart,
  Sparkles,
  Flame,
  AlertTriangle,
  Smile,
  Frown,
  Activity,
  ShieldCheck,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { useFormatCurrency } from '@/providers/CurrencyProvider';

interface EmotionalSpendingWidgetProps {
  currencySymbol?: string;
}

const MOOD_META: Record<
  string,
  { label: string; emoji: string; color: string; barBg: string; text: string }
> = {
  happy: {
    label: 'Happy',
    emoji: '😊',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30',
    barBg: 'bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  normal: {
    label: 'Normal',
    emoji: '😐',
    color: 'from-slate-500/15 to-neutral-500/10 border-slate-500/30',
    barBg: 'bg-slate-400',
    text: 'text-slate-700 dark:text-slate-300',
  },
  sad: {
    label: 'Sad',
    emoji: '😔',
    color: 'from-blue-500/20 to-sky-500/10 border-blue-500/30',
    barBg: 'bg-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
  },
  stressed: {
    label: 'Stressed',
    emoji: '😰',
    color: 'from-rose-500/20 to-red-500/10 border-rose-500/30',
    barBg: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
  },
  excited: {
    label: 'Excited',
    emoji: '🤩',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    barBg: 'bg-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
};

export default function EmotionalSpendingWidget({ currencySymbol = '₹' }: EmotionalSpendingWidgetProps) {
  const formatCurrency = useFormatCurrency();

  const {
    data: emotionalData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['emotionalSpending', currencySymbol],
    queryFn: () => dashboardApi.getEmotionalSpending(currencySymbol),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="glass-card p-6 border-ink/10 dark:border-white/10 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-ink/10 dark:bg-white/10 rounded-md" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-ink/5 dark:bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!emotionalData) {
    return null;
  }

  const { mood_breakdown = [], impulse_patterns, ai_insights = [], total_tracked_amount = 0, provider } = emotionalData;
  const hasTrackedData = total_tracked_amount > 0;

  return (
    <div className="glass-card p-6 border-ink/10 dark:border-white/10 bg-gradient-to-br from-white/90 via-white/50 to-pink-500/5 dark:from-[#131b17] dark:to-pink-950/10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ink/5 dark:border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-ink">Emotion-Aware Spending</h2>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-[10px] font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wider">
                Behavioral Insights
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Psychological mood-spending breakdown, impulse patterns, and emotional advisory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-ink/10 dark:border-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Emotional Insights"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs font-semibold text-ink-muted">
            Tracked: <strong className="text-ink">{formatCurrency(total_tracked_amount)}</strong>
          </span>
        </div>
      </div>

      {!hasTrackedData ? (
        /* Empty State */
        <div className="py-8 text-center space-y-2">
          <Smile className="w-8 h-8 mx-auto text-ink-muted/50" />
          <p className="text-xs font-semibold text-ink">No mood-tagged expenses yet this month</p>
          <p className="text-[11px] text-ink-muted max-w-md mx-auto">
            When logging expenses, select your mood (😊 Happy, 😐 Normal, 😔 Sad, 😰 Stressed, 🤩 Excited) to unlock psychological spending patterns and impulse analytics!
          </p>
        </div>
      ) : (
        <>
          {/* Mood Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {mood_breakdown.map((item) => {
              const meta = MOOD_META[item.mood] || {
                label: item.mood,
                emoji: '✨',
                color: 'from-neutral-500/10 to-transparent border-ink/10',
                barBg: 'bg-sage',
                text: 'text-ink',
              };

              return (
                <div
                  key={item.mood}
                  className={`p-3.5 rounded-2xl border bg-gradient-to-b ${meta.color} flex flex-col justify-between space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl" title={meta.label}>{meta.emoji}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-black/20 text-ink">
                      {item.percentage}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-ink-muted block">{meta.label}</span>
                    <span className="font-display font-extrabold text-sm sm:text-base text-ink block leading-tight">
                      {formatCurrency(item.total_amount)}
                    </span>
                    <span className="text-[10px] text-ink-muted block">
                      {item.count} {item.count === 1 ? 'expense' : 'expenses'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-ink/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${meta.barBg}`}
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>

                  {/* Dominant Category */}
                  {item.dominant_category && (
                    <span className="text-[9px] text-ink-muted/80 truncate block pt-1 border-t border-ink/5 dark:border-white/5">
                      Top: <strong>{item.dominant_category}</strong>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Impulse Spending Radar */}
          {impulse_patterns && (
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                impulse_patterns.total_impulse_amount > 0
                  ? 'bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border-rose-500/25'
                  : 'bg-emerald-500/10 border-emerald-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    impulse_patterns.total_impulse_amount > 0
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {impulse_patterns.total_impulse_amount > 0 ? (
                    <Flame className="w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-display font-bold text-xs sm:text-sm text-ink">
                      {impulse_patterns.total_impulse_amount > 0
                        ? 'Impulse Spending Pattern Flagged'
                        : 'Impulse Spending Under Control'}
                    </h4>
                    {impulse_patterns.total_impulse_amount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                        {impulse_patterns.impulse_percentage}% of tracked spend
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5 max-w-xl">
                    {impulse_patterns.total_impulse_amount > 0
                      ? `Detected ${impulse_patterns.flagged_transactions_count} high-ticket transactions during heightened emotional states (triggers: ${impulse_patterns.trigger_moods.join(', ')}).`
                      : 'No uncharacteristic spending spikes under high-emotion states detected this month. Disciplined control!'}
                  </p>
                </div>
              </div>

              {impulse_patterns.total_impulse_amount > 0 && (
                <div className="text-right self-end sm:self-center shrink-0">
                  <span className="text-[10px] text-ink-muted uppercase tracking-wider block font-semibold">
                    Impulse Amount
                  </span>
                  <span className="font-display font-extrabold text-base text-rose-600 dark:text-rose-400">
                    {formatCurrency(impulse_patterns.total_impulse_amount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* AI Behavioral Advice Cards */}
          {ai_insights.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI Psychological Spending Recommendations</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-ink-muted/80">
                  {provider.toUpperCase()} ENGINE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ai_insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${
                      insight.severity === 'warning'
                        ? 'bg-rose-500/5 border-rose-500/25'
                        : insight.severity === 'opportunity'
                        ? 'bg-emerald-500/5 border-emerald-500/25'
                        : 'bg-blue-500/5 border-blue-500/25'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {insight.severity === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <h5 className="font-display font-bold text-xs text-ink truncate">{insight.title}</h5>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-relaxed">{insight.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
