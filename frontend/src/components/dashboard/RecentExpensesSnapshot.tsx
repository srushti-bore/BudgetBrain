'use client';

import React from 'react';
import Link from 'next/link';
import { Expense } from '@/types';
import { formatDate } from '@/lib/utils';
import { useFormatCurrency } from '@/providers/CurrencyProvider';
import { ArrowRight, Receipt, CreditCard, Banknote, Smartphone, HelpCircle, Repeat } from 'lucide-react';

interface RecentExpensesSnapshotProps {
  expenses: Expense[];
}

const getPaymentModeIcon = (mode?: string | null) => {
  switch (mode?.toLowerCase()) {
    case 'cash':
      return <Banknote className="w-3 h-3 text-sage" />;
    case 'card':
      return <CreditCard className="w-3 h-3 text-sky" />;
    case 'upi':
      return <Smartphone className="w-3 h-3 text-honey" />;
    default:
      return <HelpCircle className="w-3 h-3 text-ink-muted" />;
  }
};

export default function RecentExpensesSnapshot({ expenses = [] }: RecentExpensesSnapshotProps) {
  const formatCurrency = useFormatCurrency();

  return (
    <div className="glass-card glass-card-hover p-6 sm:p-7 space-y-4 border-sage/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sage/15 flex items-center justify-center text-sage">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Recent Transactions</h3>
            <p className="text-xs text-ink-muted">Latest expense entries logged</p>
          </div>
        </div>

        <Link
          href="/expenses"
          className="group text-xs font-bold text-sage hover:text-sage-dark flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-sage/10 transition-all"
        >
          <span>View Full Ledger</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {expenses.length === 0 ? (
        <div className="py-12 text-center text-ink-muted text-xs flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-ink/5 dark:bg-white/5 flex items-center justify-center mb-2">
            <Receipt className="w-6 h-6 text-ink/25 dark:text-white/25" />
          </div>
          <p className="font-semibold text-ink">No recent transactions found.</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Click &quot;Log Expense&quot; above to add your first transaction.</p>
        </div>
      ) : (
        <div className="divide-y divide-ink/5 dark:divide-white/5">
          {expenses.slice(0, 5).map((expense) => (
            <div
              key={expense.id}
              className="py-3 px-2 flex items-center justify-between gap-4 rounded-xl hover:bg-ink/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sage-light dark:bg-sage/15 flex items-center justify-center text-sage shrink-0 border border-sage/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-xs sm:text-sm text-ink truncate">{expense.title}</h4>
                    {expense.is_recurring && (
                      <span
                        title="Recurring Monthly Expense"
                        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky bg-sky-light dark:bg-sky/15 px-1.5 py-0.2 rounded border border-sky/25 shrink-0"
                      >
                        <Repeat className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">Recurring</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-muted">
                    <span className="font-medium text-ink/75 dark:text-cream/75">
                      {expense.category_name || 'Uncategorized'}
                    </span>
                    <span>•</span>
                    <span>{formatDate(expense.date)}</span>
                    {expense.payment_mode && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 capitalize bg-ink/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-semibold text-ink">
                          {getPaymentModeIcon(expense.payment_mode)}
                          {expense.payment_mode}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <span className="font-display font-extrabold text-xs sm:text-sm text-coral shrink-0 tabular-nums">
                -{formatCurrency(expense.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
