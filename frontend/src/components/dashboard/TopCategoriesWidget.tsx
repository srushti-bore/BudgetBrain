'use client';

import React from 'react';
import { TopCategory } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface TopCategoriesWidgetProps {
  categories: TopCategory[];
}

export default function TopCategoriesWidget({ categories }: TopCategoriesWidgetProps) {
  if (!categories || categories.length === 0) return null;

  const maxSpent = Math.max(...categories.map((c) => c.total_spent), 1);

  return (
    <div className="glass-card p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-honey" />
          <h4 className="font-display font-bold text-sm text-ink">Top Spend Categories</h4>
        </div>
        <span className="text-[11px] text-ink-muted">Ranked</span>
      </div>

      <div className="space-y-2.5">
        {categories.map((cat, idx) => {
          const widthPercent = Math.min(Math.round((cat.total_spent / maxSpent) * 100), 100);
          return (
            <div key={cat.category_id} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-ink truncate max-w-[150px]">
                  {idx + 1}. {cat.category_name}
                </span>
                <span className="text-ink font-semibold">{formatCurrency(cat.total_spent)}</span>
              </div>
              <div className="h-1.5 w-full bg-ink/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sage to-honey rounded-full transition-all duration-500"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
