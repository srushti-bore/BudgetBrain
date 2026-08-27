'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency, getTodayDateString } from '@/lib/utils';
import { PieChart as PieIcon } from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface CategoryDonutChartProps {
  initialData?: any[];
}

const COLORS = [
  '#3E7259', // Sage Green
  '#4A8AB7', // Sky Blue
  '#C85A48', // Coral Red
  '#C68A28', // Honey Gold
  '#8E44AD', // Purple
  '#16A085', // Teal
  '#E67E22', // Orange
  '#2C3E50', // Dark Slate
];

export default function CategoryDonutChart({ initialData = [] }: CategoryDonutChartProps) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const today = getTodayDateString();
  let dateFrom: string | undefined = undefined;

  if (period === 'weekly') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dateFrom = `${year}-${month}-${day}`;
  } else {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    dateFrom = `${year}-${month}-01`;
  }

  const { data: rawCategoryData = initialData, isLoading } = useQuery({
    queryKey: ['categorySpend', period, dateFrom, today],
    queryFn: () => dashboardApi.getByCategory(dateFrom, today),
    initialData: period === 'monthly' && initialData.length > 0 ? initialData : undefined,
  });

  const categoryData: any[] = Array.isArray(rawCategoryData) ? rawCategoryData : [];

  const totalSum = categoryData.reduce((acc, item) => acc + Number(item.total ?? item.total_spent ?? 0), 0);

  const chartData = categoryData.map((item) => {
    const amount = Number(item.total ?? item.total_spent ?? 0);
    const pct = totalSum > 0 ? Math.round((amount / totalSum) * 100) : (item.percentage || 0);
    return {
      name: item.category_name,
      value: amount,
      percentage: pct,
    };
  });

  return (
    <div className="glass-card glass-card-hover p-7 flex flex-col justify-between h-full min-h-[360px] border-sage/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sage/15 flex items-center justify-center text-sage">
              <PieIcon className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Category Spend Pie</h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">Category distribution breakdown</p>
        </div>

        {/* Weekly / Monthly Toggle */}
        <div className="flex bg-ink/5 dark:bg-white/10 p-1 rounded-xl gap-1">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              period === 'weekly'
                ? 'bg-sage text-white shadow-sm'
                : 'text-ink-muted hover:text-ink dark:hover:text-cream'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              period === 'monthly'
                ? 'bg-sage text-white shadow-sm'
                : 'text-ink-muted hover:text-ink dark:hover:text-cream'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {isLoading || !isMounted ? (
        <div className="h-60 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-sage border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-60 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-sage/10 flex items-center justify-center text-sage mb-2">
            <PieIcon className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-ink">No {period} spending recorded yet.</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Log expenses to see color breakdown.</p>
        </div>
      ) : (
        <>
          <div className="h-60 w-full min-h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%" minHeight={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Spent']}
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
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Color Legend */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-ink/5 dark:border-white/10 max-h-28 overflow-y-auto">
            {chartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-ink font-semibold truncate flex-1">{entry.name}</span>
                <span className="text-ink-muted text-[11px] font-bold">{entry.percentage}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
