'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface SpendTrendChartProps {
  initialData?: any[];
}

export default function SpendTrendChart({ initialData = [] }: SpendTrendChartProps) {
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: rawTrendData = initialData, isLoading } = useQuery({
    queryKey: ['spendTrend', groupBy],
    queryFn: () => dashboardApi.getTrend(groupBy),
    initialData: groupBy === 'day' && initialData.length > 0 ? initialData : undefined,
  });

  const trendData: any[] = Array.isArray(rawTrendData) ? rawTrendData : [];

  const formattedData = trendData.map((item) => {
    const periodVal = item.period ?? item.date_period ?? '';
    const amountVal = Number(item.total ?? item.total_spent ?? 0);
    return {
      date: periodVal,
      formattedDate: groupBy === 'day' ? formatDate(periodVal) : periodVal,
      amount: amountVal,
    };
  });

  return (
    <div className="glass-card glass-card-hover p-8 flex flex-col justify-between h-full min-h-[360px] border-sage/20">
      {/* Header with GroupBy Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sage/15 flex items-center justify-center text-sage">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Spend Velocity Trend</h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">Spending momentum & velocity over time</p>
        </div>

        {/* GroupBy Buttons */}
        <div className="flex bg-ink/5 dark:bg-white/10 p-1 rounded-xl gap-1 self-start sm:self-auto">
          {(['day', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setGroupBy(period)}
              className={`px-3 py-1 text-xs font-bold capitalize rounded-lg transition-all ${
                groupBy === period
                  ? 'bg-sage text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink dark:hover:text-cream'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading || !isMounted ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-sage border-t-transparent rounded-full animate-spin" />
        </div>
      ) : formattedData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center text-ink-muted">
          <TrendingUp className="w-8 h-8 text-sage/40 mb-2" />
          <p className="text-xs font-semibold text-ink">No spend trend data available for this view.</p>
        </div>
      ) : (
        <div className="h-64 w-full min-h-[240px] relative">
          <ResponsiveContainer width="100%" height="100%" minHeight={240}>
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3E7259" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#3E7259" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(62, 114, 89, 0.15)" vertical={false} />
              <XAxis
                dataKey="formattedDate"
                tick={{ fill: '#52635B', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#52635B', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Total Spent']}
                labelFormatter={(label) => `Date/Period: ${label}`}
                contentStyle={{
                  backgroundColor: 'rgba(30, 40, 36, 0.95)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  fontSize: '12px',
                  color: '#F6F8F6',
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#3E7259"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#spendGradient)"
                activeDot={{ r: 6, fill: '#3E7259', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
