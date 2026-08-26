'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '@/lib/api';
import { Category } from '@/types';
import { Tag, Plus, Edit2, Trash2, Shield, AlertTriangle, X } from 'lucide-react';

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Deletion Warn-and-Reassign dialog state (FR-8)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [warnDialogInfo, setWarnDialogInfo] = useState<{ linkedCount: number } | null>(null);
  const [isForceDeleting, setIsForceDeleting] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  });

  const createMutation = useMutation({
    mutationFn: categoryApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => categoryApi.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setCatName('');
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    if (category.is_system) return;
    setEditingCategory(category);
    setCatName(category.name);
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, name: catName.trim() });
      } else {
        await createMutation.mutateAsync({ name: catName.trim() });
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe Category Deletion Flow (FR-8)
  const handleDeleteAttempt = async (category: Category) => {
    if (category.is_system) return;
    setDeletingCategory(category);
    setErrorMsg('');

    try {
      // First attempt normal deletion without force
      await categoryApi.delete(category.id, false);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setDeletingCategory(null);
    } catch (err: any) {
      const errResponse = err?.response?.data;
      // If linked expenses conflict (409)
      if (err?.response?.status === 409 || errResponse?.error?.code === 'CATEGORY_HAS_EXPENSES') {
        const count = errResponse?.error?.field ? parseInt(errResponse.error.field) || 1 : 1;
        setWarnDialogInfo({ linkedCount: count });
      } else {
        alert(errResponse?.error?.message || 'Failed to delete category');
        setDeletingCategory(null);
      }
    }
  };

  const handleConfirmForceDelete = async () => {
    if (!deletingCategory) return;
    setIsForceDeleting(true);
    try {
      await categoryApi.delete(deletingCategory.id, true);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setWarnDialogInfo(null);
      setDeletingCategory(null);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to force delete category');
    } finally {
      setIsForceDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Category Management
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-0.5">
            Organize expenses with custom categories & protected system fallbacks
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-[#3E7259] text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-sage/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-ink-muted">
          <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading categories...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`glass-card p-5 flex flex-col justify-between transition-all ${
                category.is_system ? 'border-sage/40 bg-sage-light/30' : 'hover:border-sage/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      category.is_system
                        ? 'bg-sage text-white shadow-xs'
                        : 'bg-sage-light text-sage border border-sage/20'
                    }`}
                  >
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-ink flex items-center gap-1.5">
                      {category.name}
                      {category.is_system && (
                        <Shield className="w-3.5 h-3.5 text-sage fill-sage/20" />
                      )}
                    </h3>
                    <span className="text-[11px] text-ink-muted font-medium">
                      {category.expense_count ?? 0} linked expense(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-ink/5 dark:border-white/10 flex items-center justify-between">
                {category.is_system ? (
                  <span className="text-[10px] font-bold text-sage uppercase tracking-wider bg-sage-light px-2 py-0.5 rounded">
                    Protected System Category
                  </span>
                ) : (
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => handleOpenEdit(category)}
                      className="px-3 py-1 rounded-lg border border-ink/15 dark:border-white/15 hover:bg-white/60 dark:hover:bg-white/10 text-ink text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-sage" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAttempt(category)}
                      className="px-3 py-1 rounded-lg border border-coral/30 hover:bg-coral-light text-coral text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-ink/10 dark:border-white/10">
              <h2 className="font-display font-bold text-lg text-ink">
                {editingCategory ? 'Rename Category' : 'Create New Category'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-ink/5 text-ink-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-coral-light border border-coral/30 rounded-xl text-xs font-medium text-coral">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Subscriptions, Travel, Fitness"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm text-ink focus:outline-none focus:border-sage transition-all"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink hover:bg-white dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-sage hover:bg-[#3E7259] text-white text-xs font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Update Name' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warn-and-Reassign Deletion Modal (FR-8) */}
      {warnDialogInfo && deletingCategory && (
        <div className="fixed inset-0 z-50 bg-ink/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-md rounded-2xl p-6 shadow-2xl border-coral/40 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-coral-light flex items-center justify-center text-coral mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-display font-bold text-lg text-ink">
                Reassign Linked Expenses?
              </h3>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Category <span className="font-bold text-ink">"{deletingCategory.name}"</span> has{' '}
                <span className="font-bold text-coral">{warnDialogInfo.linkedCount}</span> linked expense(s).
                Deleting it will reassign all linked expenses to the protected{' '}
                <span className="font-bold text-sage">"Uncategorized"</span> category in a single atomic transaction.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10 dark:border-white/10">
              <button
                onClick={() => {
                  setWarnDialogInfo(null);
                  setDeletingCategory(null);
                }}
                className="px-4 py-2 rounded-xl border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink hover:bg-white dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmForceDelete}
                disabled={isForceDeleting}
                className="px-5 py-2 bg-coral hover:bg-coral-dark text-white text-xs font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                {isForceDeleting ? 'Reassigning & Deleting...' : 'Reassign & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
