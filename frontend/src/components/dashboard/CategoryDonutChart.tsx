'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getTodayDateString } from '@/lib/utils';
import { useFormatCurrency } from '@/providers/CurrencyProvider';
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
  const formatCurrency = useFormatCurrency();
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
    <div className="glass-card glass-card-hover p-6 sm:p-7 flex flex-col justify-between h-full min-h-[380px] border-sage/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sage/15 flex items-center justify-center text-sage">
              <PieIcon className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Category Spend Breakdown</h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">Distribution across spending categories</p>
        </div>

        {/* Weekly / Monthly Toggle */}
        <div className="flex bg-ink/5 dark:bg-white/10 p-1 rounded-xl gap-1">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              period === 'weekly'
                ? 'bg-sage text-white shadow-sm'
                : 'text-ink-muted hover:text-ink dark:hover:text-cream'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-sage border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-sage/10 flex items-center justify-center text-sage mb-2">
            <PieIcon className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-ink">No {period} spending recorded yet.</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Log expenses to see category distribution.</p>
        </div>
      ) : (
        <>
          <div className="h-56 w-full relative my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="rgba(255,255,255,0.8)"
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

            {/* Centered Donut Total Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-bold">
                Total
              </span>
              <span className="font-display font-extrabold text-sm sm:text-base text-ink leading-tight">
                {formatCurrency(totalSum)}
              </span>
            </div>
          </div>

          {/* Enhanced Color Legend with Values & Percentages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-ink/5 dark:border-white/10 max-h-32 overflow-y-auto pr-1">
            {chartData.map((entry, index) => (
              <div
                key={entry.name}
                className="flex items-center justify-between gap-2 text-xs p-1.5 rounded-lg hover:bg-ink/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-ink font-semibold truncate text-xs">{entry.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-ink-muted text-[11px] font-medium">{formatCurrency(entry.value)}</span>
                  <span className="text-[10px] font-bold text-sage bg-sage-light dark:bg-sage/15 px-1.5 py-0.5 rounded">
                    {entry.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
