'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  PieChart,
  RefreshCw,
  Zap,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi, FinancialInsight } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

interface AiInsightsWidgetProps {
  currencySymbol?: string;
}

export default function AiInsightsWidget({ currencySymbol = '₹' }: AiInsightsWidgetProps) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-insights', currencySymbol, user?.id],
    queryFn: () => aiApi.getInsights(currencySymbol),
    enabled: Boolean(user && isAuthenticated),
    staleTime: 30 * 1000, // 30s cache so manual refreshes always fetch new insights
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      await refetch();
      const now = new Date();
      setLastRefreshed(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setTimeout(() => setIsRefreshing(false), 700);
    }
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'alert-triangle':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'trending-up':
        return <TrendingUp className="w-5 h-5 text-amber-500" />;
      case 'pie-chart':
        return <PieChart className="w-5 h-5 text-blue-500" />;
      case 'lightbulb':
      default:
        return <Lightbulb className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getCardStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40 text-[var(--color-text-primary)]';
      case 'warning':
        return 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 text-[var(--color-text-primary)]';
      case 'opportunity':
        return 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 text-[var(--color-text-primary)]';
      default:
        return 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-emerald-500/30 text-[var(--color-text-primary)]';
    }
  };

  const getBadgeStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'opportunity':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    }
  };

  const getProviderName = (provider: string = '') => {
    switch (provider.toLowerCase()) {
      case 'gemini':
        return 'Gemini AI';
      case 'openai':
        return 'OpenAI GPT';
      case 'anthropic':
      case 'claude':
        return 'Claude AI';
      default:
        return 'Brain Engine';
    }
  };

  const getActionTarget = (insight: FinancialInsight) => {
    const text = (insight.title + ' ' + insight.message).toLowerCase();
    if (insight.type === 'category_focus' || text.includes('category') || text.includes('expense')) {
      return { href: '/expenses', label: 'View Expenses' };
    }
    if (
      insight.type === 'deficit_alert' ||
      insight.id.includes('budget') ||
      text.includes('budget') ||
      text.includes('limit') ||
      text.includes('deficit')
    ) {
      return { href: '/budgets', label: 'Set Budget' };
    }
    return { href: '/budgets', label: 'Manage Budget' };
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 dark:border-white/5 relative overflow-hidden backdrop-blur-md">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">
                AI Financial Insights
              </h3>
              {data?.provider && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {getProviderName(data.provider)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Personalized savings & deficit control recommendations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <span className="text-[10px] text-[var(--color-text-muted)] hidden sm:inline-block font-mono">
              Updated {lastRefreshed}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="px-2.5 py-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
            title="Refresh AI Recommendations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin text-emerald-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                <div className="w-16 h-4 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="w-3/4 h-4 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              <div className="w-full h-8 rounded-md bg-zinc-200 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between">
          <span>Unable to generate insights right now.</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="font-semibold underline cursor-pointer hover:text-amber-500"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {data?.insights.map((insight: FinancialInsight, index: number) => (
              <motion.div
                key={`${insight.id}-${lastRefreshed || 'initial'}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${getCardStyle(
                  insight.severity
                )}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                      {getIcon(insight.icon)}
                    </div>
                    {insight.metric && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getBadgeStyle(insight.severity)}`}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)] mb-1 leading-snug">
                    {insight.title}
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    {insight.message}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[var(--color-border)]/40 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                  <span className="capitalize">{insight.type.replace('_', ' ')}</span>
                  {(() => {
                    const action = getActionTarget(insight);
                    return (
                      <Link
                        href={action.href}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors cursor-pointer group"
                        title={`Go to ${action.label}`}
                      >
                        <Zap className="w-2.5 h-2.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span>{action.label}</span>
                        <ArrowUpRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    );
                  })()}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
