'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import BrainLogo3D from '@/components/ui/BrainLogo3D';

function LoginFormContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isJustRegistered = searchParams.get('registered') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      router.push('/');
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Invalid email or password. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      setError('Google Sign-In is configured on the backend. Please ensure NEXT_PUBLIC_GOOGLE_CLIENT_ID is set in your frontend environment for live OAuth popups.');
    } else {
      setError('Redirecting to Google Secure Authorization...');
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

      {/* Newly Registered Success Banner */}
      {isJustRegistered && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold leading-relaxed flex items-center gap-2"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>Account created successfully! Please enter your credentials to sign in.</span>
        </motion.div>
      )}

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm leading-relaxed"
        >
          {error}
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all placeholder:text-[var(--color-text-muted)]/60"
            />
          </div>
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
              autoComplete="current-password"
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
      <button
        type="button"
        onClick={handleGoogleClick}
        className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] font-medium text-sm flex items-center justify-center gap-3 transition-all shadow-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Sign in with Google</span>
      </button>

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

