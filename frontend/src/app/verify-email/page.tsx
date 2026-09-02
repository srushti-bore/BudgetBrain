'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, ShieldCheck, RefreshCw, Mail } from 'lucide-react';
import BrainLogo3D from '@/components/ui/BrainLogo3D';
import { authApi } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email address...');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided in the URL. Please use the link sent to your email.');
      return;
    }

    const verify = async () => {
      try {
        const response = await authApi.verifyEmail(token);
        setStatus('success');
        setMessage(response.message || 'Email verified successfully! You can now sign in.');
      } catch (err: any) {
        setStatus('error');
        const errDetail =
          err.response?.data?.error?.message ||
          err.message ||
          'Verification failed. The link may have expired or is invalid.';
        setMessage(errDetail);
      }
    };

    verify();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim() || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setResendMessage(null);
    try {
      const res = await authApi.resendVerification(resendEmail.trim());
      setResendMessage(res.message || 'If an unverified account exists, a new activation link has been sent!');
      setResendCooldown(60);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to resend verification link.';
      setResendMessage(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-7 sm:p-9 shadow-2xl border border-white/10 dark:border-white/5 relative z-10 backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 mb-2.5 flex items-center justify-center">
          <BrainLogo3D size="sm" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-[var(--color-text-primary)] tracking-tight">
          Email Verification
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-1.5 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          BudgetBrain Security Gateway
        </p>
      </div>

      {/* Loading State */}
      {status === 'loading' && (
        <div className="text-center py-8 space-y-4">
          <div className="w-12 h-12 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{message}</p>
        </div>
      )}

      {/* Success State */}
      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-inner">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Verified Successfully
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Account Activated!
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed max-w-sm mx-auto">
              {message}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login?verified=true"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all"
            >
              <span>Sign In to Your Vault</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* Error / Expired State */}
      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-5"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
            <XCircle className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              Verification Failed
            </h2>
            <p className="text-xs sm:text-sm text-red-500 dark:text-red-400 leading-relaxed max-w-sm mx-auto">
              {message}
            </p>
          </div>

          {/* Resend Verification Form */}
          <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-left space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Request a New Link
            </p>

            {resendMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                {resendMessage}
              </div>
            )}

            <form onSubmit={handleResend} className="space-y-2.5">
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="email"
                  required
                  placeholder="Enter your registered email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
                />
              </div>

              <button
                type="submit"
                disabled={!resendEmail.trim() || resendCooldown > 0 || isResending}
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                {resendCooldown > 0
                  ? `Wait ${resendCooldown}s to resend`
                  : 'Send New Verification Link'}
              </button>
            </form>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
            >
              Return to Sign In <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[var(--color-bg)] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Suspense
          fallback={
            <div className="glass-card rounded-3xl p-9 text-center">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
