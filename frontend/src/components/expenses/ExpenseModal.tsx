'use client';

import React, { useState, useEffect } from 'react';
import { Expense, Category, PaymentMode } from '@/types';
import { getTodayDateString } from '@/lib/utils';
import { X, Plus, AlertCircle, Repeat } from 'lucide-react';
import { categoryApi } from '@/lib/api';
import { useCurrency } from '@/providers/CurrencyProvider';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    category_id: string;
    date: string;
    notes?: string | null;
    payment_mode?: PaymentMode | null;
    is_recurring?: boolean;
  }) => Promise<void>;
  initialData?: Expense | null;
  categories: Category[];
  onCategoryCreated?: (newCategory: Category) => void;
}

export default function ExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  onCategoryCreated,
}: ExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [paymentMode, setPaymentMode] = useState<PaymentMode | ''>('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Inline Quick Category Creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catCreating, setCatCreating] = useState(false);

  const { currency, convertToView, convertToBase } = useCurrency();

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      const viewAmount = convertToView(initialData.amount);
      setAmount(Number(viewAmount.toFixed(2)).toString());
      setCategoryId(initialData.category_id);
      setDate(initialData.date);
      setPaymentMode(initialData.payment_mode || '');
      setNotes(initialData.notes || '');
      setIsRecurring(Boolean(initialData.is_recurring));
    } else {
      setTitle('');
      setAmount('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setDate(getTodayDateString());
      setPaymentMode('');
      setNotes('');
      setIsRecurring(false);
    }
    setErrorMsg('');
  }, [initialData, isOpen, categories, currency]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmountInView = parseFloat(amount);
    if (!title.trim()) {
      setErrorMsg('Expense title is required');
      return;
    }
    if (isNaN(parsedAmountInView) || parsedAmountInView <= 0) {
      setErrorMsg(`Amount must be a positive number greater than ${currency === 'INR' ? '₹0' : '0'}`);
      return;
    }
    if (!categoryId) {
      setErrorMsg('Please select a category');
      return;
    }
    if (date > getTodayDateString()) {
      setErrorMsg('Expense date cannot be in the future');
      return;
    }

    const parsedAmountInBase = Number(convertToBase(parsedAmountInView).toFixed(2));

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        amount: parsedAmountInBase,
        category_id: categoryId,
        date,
        payment_mode: (paymentMode as PaymentMode) || null,
        notes: notes.trim() || null,
        is_recurring: isRecurring,
      });
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to save expense';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setCatCreating(true);
    try {
      const created = await categoryApi.create({ name: newCatName.trim() });
      if (onCategoryCreated) onCategoryCreated(created);
      setCategoryId(created.id);
      setNewCatName('');
      setIsAddingCategory(false);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to create category');
    } finally {
      setCatCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-ink/10 dark:border-white/10">
          <h2 className="font-display font-bold text-xl text-ink">
            {initialData ? 'Edit Expense' : 'Log New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-ink/5 dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-coral-light border border-coral/30 rounded-xl text-xs font-medium text-coral flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">
              Title <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Grocery Shopping, House Rent, Fuel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm text-ink focus:outline-none focus:border-sage transition-all"
              required
            />
          </div>

          {/* Amount and Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Amount ({currency}) <span className="text-coral">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm font-bold text-ink focus:outline-none focus:border-sage transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Date <span className="text-coral">*</span>
              </label>
              <input
                type="date"
                max={getTodayDateString()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm text-ink focus:outline-none focus:border-sage transition-all"
                required
              />
            </div>
          </div>

          {/* Category Dropdown with inline creation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-ink-muted">
                Category <span className="text-coral">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="text-[11px] font-bold text-sage hover:text-sage/80 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> New Category
              </button>
            </div>

            {isAddingCategory ? (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="New category name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-sage/40 text-xs text-ink focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={catCreating}
                  className="px-3 py-1.5 bg-sage hover:bg-[#2D5A45] text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Save
                </button>
              </div>
            ) : null}

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm text-ink focus:outline-none focus:border-sage transition-all"
              required
            >
              <option value="" disabled>
                Select Category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} {cat.is_system ? '(System)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Recurring Expense Checkbox Toggle */}
          <div className="p-3 bg-sage-light/50 dark:bg-sage/10 rounded-xl border border-sage/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-sage" />
              <div>
                <span className="text-xs font-bold text-ink block">Recurring Monthly Expense</span>
                <span className="text-[10px] text-ink-muted">Rent, Wifi, Gym, Subscriptions</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 accent-sage rounded cursor-pointer"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">
              Payment Mode (Optional)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['upi', 'card', 'cash', 'other'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(paymentMode === mode ? '' : mode)}
                  className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    paymentMode === mode
                      ? 'bg-sage text-white border-sage shadow-xs'
                      : 'bg-white/60 dark:bg-white/5 text-ink-muted border-ink/10 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 hover:text-ink'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add details, receipt numbers, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-xs text-ink focus:outline-none focus:border-sage transition-all resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink hover:bg-white dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-sage hover:bg-[#2D5A45] text-white text-xs font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Expense' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
