'use client';

import React from 'react';
import Link from 'next/link';
import { Expense } from '@/types';
import { formatDate } from '@/lib/utils';
import { useFormatCurrency } from '@/providers/CurrencyProvider';
import { ArrowRight, Receipt } from 'lucide-react';

interface RecentExpensesSnapshotProps {
  expenses: Expense[];
}

export default function RecentExpensesSnapshot({ expenses = [] }: RecentExpensesSnapshotProps) {
  const formatCurrency = useFormatCurrency();
  return (
    <div className="glass-card glass-card-hover p-7 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Recent Expenses</h3>
          <p className="text-xs text-ink-muted">Snapshot of your latest transactions</p>
        </div>

        <Link
          href="/expenses"
          className="text-xs font-bold text-sage hover:text-sage/80 flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {expenses.length === 0 ? (
        <div className="py-8 text-center text-ink-muted text-xs flex flex-col items-center">
          <Receipt className="w-8 h-8 text-ink/20 mb-2" />
          <p>No recent expenses recorded.</p>
        </div>
      ) : (
        <div className="divide-y divide-ink/5 dark:divide-white/5">
          {expenses.slice(0, 5).map((expense) => (
            <div key={expense.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-ink/5 dark:bg-white/10 flex items-center justify-center text-ink shrink-0">
                  <Receipt className="w-4 h-4 text-sage" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-ink">{expense.title}</h4>
                  <span className="text-[11px] text-ink-muted">
                    {expense.category_name || 'Uncategorized'} • {formatDate(expense.date)}
                  </span>
                </div>
              </div>

              <span className="font-display font-extrabold text-xs text-coral">
                -{formatCurrency(expense.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
