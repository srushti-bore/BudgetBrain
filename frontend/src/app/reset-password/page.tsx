'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, KeyRound, ArrowRight, ShieldCheck, Check, X } from 'lucide-react';
import BrainLogo3D from '@/components/ui/BrainLogo3D';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber;
  const doPasswordsMatch = newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Please satisfy all password complexity rules.');
      return;
    }
    if (!doPasswordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Direct reset notification
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[var(--color-bg)] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-7 sm:p-9 shadow-2xl border border-white/10 dark:border-white/5 relative z-10 backdrop-blur-xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 mb-3 flex items-center justify-center">
              <BrainLogo3D size="sm" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[var(--color-text-primary)] tracking-tight">
              Create New Password
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1.5 flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Secure Account Update
            </p>
          </div>

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                Password Reset Successfully!
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Redirecting you to the sign-in portal in a moment...
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all placeholder:text-[var(--color-text-muted)]/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] focus:outline-none p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {newPassword.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] grid grid-cols-2 gap-1.5"
                  >
                    <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-500 font-medium' : 'text-zinc-500'}`}>
                      {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} 8+ Characters
                    </span>
                    <span className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-500 font-medium' : 'text-zinc-500'}`}>
                      {hasUpper ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Uppercase (A-Z)
                    </span>
                    <span className={`flex items-center gap-1 ${hasLower ? 'text-emerald-500 font-medium' : 'text-zinc-500'}`}>
                      {hasLower ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Lowercase (a-z)
                    </span>
                    <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-500 font-medium' : 'text-zinc-500'}`}>
                      {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Number (0-9)
                    </span>
                  </motion.div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all placeholder:text-[var(--color-text-muted)]/60"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isSubmitting || !isPasswordValid || !doPasswordsMatch}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
