'use client';

import React from 'react';
import { TopCategory } from '@/types';
import { useFormatCurrency } from '@/providers/CurrencyProvider';
import { Trophy } from 'lucide-react';

interface TopCategoriesWidgetProps {
  categories: TopCategory[];
}

export default function TopCategoriesWidget({ categories = [] }: TopCategoriesWidgetProps) {
  const formatCurrency = useFormatCurrency();
  if (categories.length === 0) {
    return (
      <div className="glass-card glass-card-hover p-7 flex flex-col justify-between h-full min-h-[180px]">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Top Spend Categories</h3>
          <p className="text-xs text-ink-muted">Highest spending areas</p>
        </div>
        <p className="text-xs text-ink-muted my-auto">No category spend data available yet.</p>
      </div>
    );
  }

  const maxSpent = categories[0]?.total_spent || 1;

  return (
    <div className="glass-card glass-card-hover p-7 flex flex-col justify-between h-full min-h-[180px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Top Spend Categories</h3>
          <p className="text-xs text-ink-muted">Highest spending drivers this month</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-honey/15 flex items-center justify-center text-honey border border-honey/30">
          <Trophy className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-2.5 my-auto">
        {categories.slice(0, 3).map((item, idx) => {
          const barWidth = Math.min(Math.round((item.total_spent / maxSpent) * 100), 100);
          return (
            <div key={item.category_id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-ink-muted bg-ink/5 dark:bg-white/10 px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                  {item.category_name}
                </span>
                <span className="font-bold text-coral">{formatCurrency(item.total_spent)}</span>
              </div>
              <div className="h-1.5 w-full bg-ink/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
