'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

interface MonthlyCategoryGraphProps {
  data?: any[];
}

const COLORS = [
  '#3E7259', // Sage Green
  '#4A8AB7', // Sky Blue
  '#C68A28', // Honey Gold
  '#C85A48', // Coral Red
  '#8E44AD', // Purple
  '#16A085', // Teal
  '#E67E22', // Orange
];

export default function MonthlyCategoryGraph({ data = [] }: MonthlyCategoryGraphProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const categoryList: any[] = Array.isArray(data) ? data : [];

  if (!categoryList || categoryList.length === 0) {
    return (
      <div className="glass-card glass-card-hover p-6 flex flex-col items-center justify-center text-center h-full min-h-[360px] border-sage/20">
        <div className="w-12 h-12 rounded-2xl bg-sage/15 flex items-center justify-center text-sage mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="font-display font-bold text-base text-ink mb-1">Monthly Category Graph</h3>
        <p className="text-xs text-ink-muted">Log expenses to populate category monthly graph.</p>
      </div>
    );
  }

  const chartData = categoryList.map((item) => ({
    category: item.category_name,
    amount: Number(item.total ?? item.total_spent ?? 0),
  }));

  return (
    <div className="glass-card glass-card-hover p-6 flex flex-col justify-between h-full min-h-[360px] border-sage/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sage/15 flex items-center justify-center text-sage">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Monthly Category Graph</h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">Category-wise monthly spending breakdown</p>
        </div>
        <span className="text-[11px] font-bold text-sage uppercase tracking-wider bg-sage-light px-2.5 py-1 rounded-lg border border-sage/20">
          Bar Chart
        </span>
      </div>

      {!isMounted ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-sage border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="h-64 w-full min-h-[240px] relative">
          <ResponsiveContainer width="100%" height="100%" minHeight={240}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 35 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(62, 114, 89, 0.15)" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fill: '#52635B', fontSize: 10, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                angle={-20}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fill: '#52635B', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Monthly Spend']}
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
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
