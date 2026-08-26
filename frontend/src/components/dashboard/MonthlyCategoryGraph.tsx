'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { CategorySpend } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { BarChart3 } from 'lucide-react';

interface MonthlyCategoryGraphProps {
  data: CategorySpend[];
}

const COLORS = ['#4E8D6E', '#4A8AB7', '#D99B38', '#D96B50', '#A882DD', '#56B9B6', '#E87A90'];

export default function MonthlyCategoryGraph({ data }: MonthlyCategoryGraphProps) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card glass-card-hover p-6 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-sage/15 flex items-center justify-center text-sage mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="font-display font-bold text-base text-ink mb-1">No Monthly Category Graph</h3>
        <p className="text-xs text-ink-muted">Log expenses to populate category monthly graph.</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    category: item.category_name,
    amount: item.total_spent,
    percentage: item.percentage,
  }));

  return (
    <div className="glass-card glass-card-hover p-6 flex flex-col justify-between h-full min-h-[340px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sage" />
            <h3 className="font-display font-bold text-lg text-ink">Monthly Category Graph</h3>
          </div>
          <p className="text-xs text-ink-muted">Category-wise monthly spending comparison</p>
        </div>
        <span className="text-[11px] font-bold text-sage uppercase tracking-wider bg-sage-light px-2.5 py-1 rounded-lg">
          Monthly Bar Chart
        </span>
      </div>

      <div className="h-64 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(78, 141, 110, 0.1)" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fill: '#62726B', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              angle={-20}
              textAnchor="end"
            />
            <YAxis tick={{ fill: '#62726B', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Monthly Spend']}
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
            <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
