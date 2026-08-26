'use client';

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CategorySpend } from '../../types';
import { formatCurrency, getTodayDateString } from '../../lib/utils';
import { PieChart as PieIcon, Calendar } from 'lucide-react';
import { dashboardApi } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';

interface CategoryDonutChartProps {
  initialData?: CategorySpend[];
}

const COLORS = ['#4E8D6E', '#D96B50', '#D99B38', '#4A8AB7', '#A882DD', '#56B9B6', '#E87A90'];

export default function CategoryDonutChart({ initialData = [] }: CategoryDonutChartProps) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');

  // Compute dates for Weekly vs Monthly
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

  const { data: categoryData = initialData, isLoading } = useQuery({
    queryKey: ['categorySpend', period, dateFrom, today],
    queryFn: () => dashboardApi.getByCategory(dateFrom, today),
    initialData: period === 'monthly' && initialData.length > 0 ? initialData : undefined,
  });

  const chartData = categoryData.map((item) => ({
    name: item.category_name,
    value: item.total_spent,
    percentage: item.percentage,
  }));

  return (
    <div className="glass-card glass-card-hover p-6 flex flex-col justify-between h-full min-h-[340px]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Category Spend Pie</h3>
          <p className="text-xs text-ink-muted">Distribution Breakdown</p>
        </div>

        {/* Weekly / Monthly Toggle */}
        <div className="flex bg-ink/5 dark:bg-white/10 p-1 rounded-xl gap-1">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              period === 'weekly'
                ? 'bg-sage text-white shadow-xs'
                : 'text-ink-muted hover:text-ink dark:hover:text-cream'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              period === 'monthly'
                ? 'bg-sage text-white shadow-xs'
                : 'text-ink-muted hover:text-ink dark:hover:text-cream'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-56 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-sage border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky/15 flex items-center justify-center text-sky mb-2">
            <PieIcon className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-ink">No {period} spending recorded.</p>
        </div>
      ) : (
        <>
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
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
                    backgroundColor: 'rgba(20, 28, 24, 0.95)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    fontSize: '12px',
                    color: '#FBF7EF',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend list */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-ink/5 dark:border-white/10 max-h-24 overflow-y-auto pr-1">
            {chartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-ink font-medium truncate flex-1">{entry.name}</span>
                <span className="text-ink-muted text-[11px] font-bold">{entry.percentage}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
