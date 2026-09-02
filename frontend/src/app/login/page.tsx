'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import BrainLogo3D from '@/components/ui/BrainLogo3D';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import { authApi } from '@/lib/api';
import { suggestEmailCorrection } from '@/lib/utils';

function LoginFormContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailUnverified, setIsEmailUnverified] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isJustRegistered = searchParams.get('registered') === 'true';
  const isJustVerified = searchParams.get('verified') === 'true';

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Explicitly ensure email and password start completely empty on mount
  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsEmailUnverified(false);
    setResendStatus(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      router.push('/');
    } catch (err: any) {
      const errCode = err.response?.data?.error?.code;
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Invalid email or password. Please try again.';

      if (errCode === 'EMAIL_NOT_VERIFIED' || msg.toLowerCase().includes('not verified')) {
        setIsEmailUnverified(true);
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await authApi.resendVerification(email.trim());
      setResendStatus(res.message || 'Verification link sent! Please check your email.');
      setResendCooldown(60);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to resend verification link.';
      setResendStatus(msg);
    } finally {
      setIsResending(false);
    }
  };


  return (
    <div className="glass-card rounded-3xl p-7 sm:p-9 shadow-2xl border border-white/10 dark:border-white/5 relative z-10 backdrop-blur-xl">
      {/* Logo & Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 mb-2.5 flex items-center justify-center">
          <BrainLogo3D size="sm" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-[var(--color-text-primary)] tracking-tight">
          Welcome to BudgetBrain
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1.5 flex items-center gap-1.5 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Your Private, Multi-Tenant Financial Vault
        </p>
      </div>

      {/* Verified Success Banner */}
      {isJustVerified && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold leading-relaxed flex items-center gap-2"
        >
          <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span>Email verified successfully! Please sign in with your credentials.</span>
        </motion.div>
      )}

      {/* Newly Registered Success Banner */}
      {isJustRegistered && !isJustVerified && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold leading-relaxed flex items-center gap-2"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>Account created successfully! Please verify your email before logging in.</span>
        </motion.div>
      )}

      {/* Error Banner with Unverified Resend Option */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`mb-5 p-3.5 rounded-xl text-xs sm:text-sm leading-relaxed ${
            isEmailUnverified
              ? 'bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 space-y-2'
              : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
          }`}
        >
          <div className="flex items-start gap-2">
            {isEmailUnverified && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div>{error}</div>
          </div>

          {isEmailUnverified && (
            <div className="pt-1.5 border-t border-amber-500/20 flex flex-col gap-1.5">
              {resendStatus && (
                <div className="text-emerald-500 font-medium">{resendStatus}</div>
              )}
              <button
                type="button"
                onClick={handleResend}
                disabled={!email.trim() || resendCooldown > 0 || isResending}
                className="w-full py-2 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                {resendCooldown > 0
                  ? `Resend available in ${resendCooldown}s`
                  : 'Resend Verification Link'}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
        {/* Email Field with Smart Typo Suggestion */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-surface)] border text-[var(--color-text-primary)] text-sm focus:outline-none transition-all placeholder:text-[var(--color-text-muted)]/60 ${
                suggestEmailCorrection(email)
                  ? 'border-amber-500/80 ring-2 ring-amber-500/20'
                  : 'border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-primary)]/40'
              }`}
            />
          </div>

          {/* Smart Typo Suggestion Pill */}
          {suggestEmailCorrection(email) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300"
            >
              <span className="truncate pr-2">
                Did you mean <strong className="font-mono underline">{suggestEmailCorrection(email)}</strong>?
              </span>
              <button
                type="button"
                onClick={() => setEmail(suggestEmailCorrection(email)!)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-bold transition-all text-amber-800 dark:text-amber-200 text-[11px]"
              >
                Fix it ✓
              </button>
            </motion.div>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--color-primary)] hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative flex items-center">
            <Lock className="absolute left-3.5 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        </div>

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Sign In to BudgetBrain</span>
            </>
          )}
        </motion.button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--color-surface)] px-3 text-[var(--color-text-muted)] font-medium">
            Or continue with
          </span>
        </div>
      </div>

      {/* Google OAuth Button */}
      <GoogleAuthButton text="signin_with" onError={(msg) => setError(msg)} />


      {/* Footer Note */}
      <div className="mt-7 text-center">
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-[var(--color-primary)] font-semibold hover:underline inline-flex items-center gap-1"
          >
            Sign Up <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[var(--color-bg)] relative overflow-hidden">
      {/* Background ambient decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Suspense
          fallback={
            <div className="glass-card rounded-3xl p-8 text-center text-sm text-[var(--color-text-muted)] animate-pulse">
              Loading security portal...
            </div>
          }
        >
          <LoginFormContent />
        </Suspense>
      </motion.div>
    </div>
  );
}

