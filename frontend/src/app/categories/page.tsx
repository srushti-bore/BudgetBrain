'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '@/lib/api';
import { Category } from '@/types';
import { capitalizeFirstLetter } from '@/lib/utils';
import { Tag, Plus, Edit2, Trash2, Shield, AlertTriangle, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Delete Category Confirmation Modal State
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

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
    setErrorMsg('');

    const formattedName = capitalizeFirstLetter(catName);
    if (!formattedName) {
      setErrorMsg('Category name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, name: formattedName });
        showToast('Category renamed successfully!');
      } else {
        await createMutation.mutateAsync({ name: formattedName });
        showToast('Category created successfully!');
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleDeleteClick = (category: Category) => {
    if (category.is_system) return;
    setDeletingCategory(category);
  };

  // Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      await categoryApi.delete(deletingCategory.id, true);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      showToast(`Category "${deletingCategory.name}" deleted successfully!`);
      setDeletingCategory(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || 'Failed to delete category', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      {/* Toast Notification (Center Top) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold border backdrop-blur-md transition-all ${
              toastMessage.type === 'success'
                ? 'bg-sage-light text-sage border-sage/40 dark:bg-sage/20 dark:text-sage shadow-sage/10'
                : 'bg-coral-light text-coral border-coral/40 dark:bg-coral/20 dark:text-coral shadow-coral/10'
            }`}
          >
            {toastMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-[#3E7259] text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-sage/20 transition-all self-start sm:self-auto cursor-pointer"
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
                      className="px-3 py-1.5 rounded-lg border border-ink/15 dark:border-white/15 hover:bg-white/60 dark:hover:bg-white/10 text-ink text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-sage" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(category)}
                      className="px-3 py-1.5 rounded-lg border border-coral/30 hover:bg-coral-light text-coral text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
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
                className="p-1 rounded-lg hover:bg-ink/5 text-ink-muted hover:text-ink transition-colors cursor-pointer"
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
                  onChange={(e) => setCatName(capitalizeFirstLetter(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-ink/15 dark:border-white/15 text-sm text-ink focus:outline-none focus:border-sage transition-all"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink hover:bg-white dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-sage hover:bg-[#3E7259] text-white text-xs font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Update Name' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Pop-up Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 bg-ink/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-modal w-full max-w-md rounded-2xl p-6 shadow-2xl border-coral/40 space-y-4 relative"
          >
            <div className="flex items-center justify-between pb-2 border-b border-ink/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-coral-light flex items-center justify-center text-coral shadow-xs">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-ink">Delete Category?</h3>
                  <span className="text-[11px] text-ink-muted">This action cannot be undone</span>
                </div>
              </div>
              <button
                onClick={() => setDeletingCategory(null)}
                className="p-1.5 rounded-lg hover:bg-ink/5 dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category details card */}
            <div className="p-4 rounded-xl bg-ink/5 dark:bg-white/5 border border-ink/10 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-ink">{deletingCategory.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sage-light text-sage border border-sage/25">
                  {deletingCategory.expense_count ?? 0} Linked Expense(s)
                </span>
              </div>
            </div>

            {(deletingCategory.expense_count ?? 0) > 0 ? (
              <div className="p-3 rounded-xl bg-honey-light/80 border border-honey/40 text-honey flex items-start gap-2.5 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold block">Safe Reassignment Protection</span>
                  <p className="mt-0.5 leading-relaxed text-[11px]">
                    This category has <strong>{deletingCategory.expense_count}</strong> linked expense(s).
                    Deleting it will automatically and safely reassign all linked expenses to the protected{' '}
                    <strong>&quot;Uncategorized&quot;</strong> category.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted leading-relaxed">
                Are you sure you want to delete category <strong>&quot;{deletingCategory.name}&quot;</strong>? This action cannot be undone.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2.5 rounded-xl border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-coral hover:bg-coral-dark text-white text-xs font-bold rounded-xl shadow-md shadow-coral/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isDeleting
                    ? 'Deleting...'
                    : (deletingCategory.expense_count ?? 0) > 0
                    ? 'Reassign & Delete'
                    : 'Confirm Delete'}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
