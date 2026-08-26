'use client';

import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SpendTrendItem } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { TrendingUp } from 'lucide-react';
import { dashboardApi } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';

interface SpendTrendChartProps {
  initialData: SpendTrendItem[];
}

export default function SpendTrendChart({ initialData }: SpendTrendChartProps) {
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { data: trendData = initialData, isLoading } = useQuery({
    queryKey: ['spendTrend', groupBy],
    queryFn: () => dashboardApi.getTrend(groupBy),
    initialData: groupBy === 'day' ? initialData : undefined,
  });

  const formattedData = trendData.map((item) => ({
    date: item.date_period,
    formattedDate: groupBy === 'day' ? formatDate(item.date_period) : item.date_period,
    amount: item.total_spent,
  }));

  return (
    <div className="glass-card glass-card-hover p-6 flex flex-col justify-between h-full min-h-[340px]">
      {/* Header with GroupBy Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sage" />
            <h3 className="font-display font-bold text-lg text-ink">Spend Velocity Trend</h3>
          </div>
          <p className="text-xs text-ink-muted">Historical spending patterns over time</p>
        </div>

        {/* GroupBy Buttons */}
        <div className="flex bg-ink/5 dark:bg-white/10 p-1 rounded-xl gap-1 self-start sm:self-auto">
          {(['day', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setGroupBy(period)}
              className={`px-3 py-1 text-xs font-bold capitalize rounded-lg transition-all ${
                groupBy === period
                  ? 'bg-sage text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink dark:hover:text-cream'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-60 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-sage border-t-transparent rounded-full animate-spin" />
        </div>
      ) : formattedData.length === 0 ? (
        <div className="h-60 flex flex-col items-center justify-center text-center text-ink-muted">
          <p className="text-xs font-semibold">No spend trend data available for this view.</p>
        </div>
      ) : (
        <div className="h-60 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4E8D6E" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4E8D6E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(78, 141, 110, 0.1)" vertical={false} />
              <XAxis
                dataKey="formattedDate"
                tick={{ fill: '#62726B', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#62726B', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Total Spent']}
                labelFormatter={(label) => `Period: ${label}`}
                contentStyle={{
                  backgroundColor: 'rgba(20, 28, 24, 0.95)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  fontSize: '12px',
                  color: '#FBF7EF',
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#4E8D6E"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#spendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
