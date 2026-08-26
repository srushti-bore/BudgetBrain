'use client';

import React from 'react';
import Link from 'next/link';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowRight, Receipt } from 'lucide-react';

interface RecentExpensesSnapshotProps {
  expenses: Expense[];
}

export default function RecentExpensesSnapshot({ expenses }: RecentExpensesSnapshotProps) {
  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Recent Expenses</h3>
          <p className="text-xs text-ink-muted">Latest 5 transactions snapshot</p>
        </div>
        <Link
          href="/expenses"
          className="text-xs font-semibold text-sage hover:text-sage/80 flex items-center gap-1 group transition-colors"
        >
          View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {expenses.length === 0 ? (
        <div className="py-8 text-center text-xs text-ink-muted">
          <Receipt className="w-8 h-8 mx-auto text-ink/20 mb-2" />
          No expenses logged yet.
        </div>
      ) : (
        <div className="divide-y divide-ink/5">
          {expenses.map((expense) => (
            <div key={expense.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-sage-light flex items-center justify-center text-sage shrink-0 border border-sage/20">
                  <Receipt className="w-4 h-4 text-ink" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-ink block truncate">{expense.title}</span>
                  <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                    <span className="bg-ink/5 px-2 py-0.5 rounded-md font-medium text-ink/80">
                      {expense.category_name || 'Uncategorized'}
                    </span>
                    <span>•</span>
                    <span>{formatDate(expense.date)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-display font-bold text-sm text-coral">
                  -{formatCurrency(expense.amount)}
                </span>
                {expense.payment_mode && (
                  <span className="block text-[10px] text-ink-muted uppercase font-medium">
                    {expense.payment_mode}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
