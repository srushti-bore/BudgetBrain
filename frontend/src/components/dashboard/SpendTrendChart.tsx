'use client';

import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SpendTrendItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import { dashboardApi } from '@/lib/api';

interface SpendTrendChartProps {
  initialData: SpendTrendItem[];
}

export default function SpendTrendChart({ initialData }: SpendTrendChartProps) {
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [trendData, setTrendData] = useState<SpendTrendItem[]>(initialData);
  const [loading, setLoading] = useState(false);

  const handleGroupChange = async (group: 'day' | 'week' | 'month') => {
    setGroupBy(group);
    setLoading(true);
    try {
      const freshData = await dashboardApi.getTrend(group);
      setTrendData(freshData);
    } catch (err) {
      console.error('Failed to fetch trend data', err);
    } finally {
      setLoading(false);
    }
  };

  const formattedData = trendData.map((item) => ({
    period: groupBy === 'day' ? formatDate(item.date_period) : item.date_period,
    amount: item.total_spent,
  }));

  return (
    <div className="glass-card p-6 flex flex-col justify-between h-full min-h-[340px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sage" />
            <h3 className="font-display font-bold text-lg text-ink">Spend Trend</h3>
          </div>
          <p className="text-xs text-ink-muted">Historical spending velocity over time</p>
        </div>

        {/* Group By Toggle */}
        <div className="flex bg-ink/5 p-1 rounded-xl gap-1 self-start sm:self-auto">
          {(['day', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => handleGroupChange(period)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                groupBy === period
                  ? 'bg-white text-ink shadow-xs border border-ink/5'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="h-60 w-full relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-xs flex items-center justify-center z-10 rounded-xl">
            <div className="w-6 h-6 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-ink-muted">
            No spending trend recorded yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7FB89A" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7FB89A" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(46, 59, 54, 0.05)" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#62726B', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#62726B', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Spent']}
                contentStyle={{
                  backgroundColor: 'rgba(251, 247, 239, 0.95)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                  color: '#2E3B36',
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#7FB89A"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#trendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
