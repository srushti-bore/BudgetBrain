'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, KeyRound, ShieldCheck, Check, X, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { authApi } from '@/lib/api';
import BrainLogo3D from '@/components/ui/BrainLogo3D';
import OTPInput from '@/components/auth/OTPInput';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend OTP Cooldown Timer
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      setIsEditingEmail(false);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber;
  const doPasswordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isOtpValid = otp.trim().length === 6;

  const handleResendCode = async () => {
    if (!email.trim()) {
      setError('Please provide your email address to receive a verification code.');
      setIsEditingEmail(true);
      return;
    }
    if (cooldown > 0 || isResending) return;

    setError(null);
    setIsResending(true);
    setResendStatus(null);

    try {
      await authApi.forgotPassword(email.trim());
      setCooldown(60);
      setResendStatus('A fresh 6-digit code has been sent to your inbox.');
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
        'Failed to resend code. Please wait a moment and try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() && !token) {
      setError('Email address is required.');
      setIsEditingEmail(true);
      return;
    }

    if (!token && !isOtpValid) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please satisfy all password complexity requirements before proceeding.');
      return;
    }

    if (!doPasswordsMatch) {
      setError('New passwords do not match.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await authApi.resetPassword({
        email: email.trim() || undefined,
        otp: otp.trim() || undefined,
        token: token || undefined,
        new_password: newPassword,
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Reset Password API Error:', err);
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail?.[0]?.msg ||
        err.message ||
        'Failed to reset password. Please verify your 6-digit code and try again.';
      setError(msg);
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
              Secure 6-Digit OTP Verification
            </p>
          </div>

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                Password Reset Successfully!
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Your credentials have been updated. Redirecting you to sign in...
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              {resendStatus && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
                  {resendStatus}
                </div>
              )}

              {/* Email Address Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Email Address
                  </label>
                  {!isEditingEmail && email && (
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(true)}
                      className="text-[11px] text-emerald-600 hover:text-emerald-500 font-semibold cursor-pointer"
                    >
                      Change
                    </button>
                  )}
                </div>

                {isEditingEmail ? (
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all"
                    />
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] flex items-center justify-between">
                    <span className="truncate">{email}</span>
                    <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      Target Vault
                    </span>
                  </div>
                )}
              </div>

              {/* 6-Digit OTP Input */}
              {!token && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      6-Digit Security Code
                    </label>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      Expires in 10 mins
                    </span>
                  </div>
                  <OTPInput
                    value={otp}
                    onChange={setOtp}
                    disabled={isSubmitting}
                    isError={Boolean(error && (error.toLowerCase().includes('code') || error.toLowerCase().includes('otp')))}
                  />
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      disabled={cooldown > 0 || isResending}
                      onClick={handleResendCode}
                      className="text-xs text-emerald-600 hover:text-emerald-500 disabled:text-zinc-500 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                      {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password Input */}
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
                    className="absolute right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] focus:outline-none p-1 cursor-pointer"
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

              {/* Confirm Password Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all placeholder:text-[var(--color-text-muted)]/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] focus:outline-none p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isSubmitting || (!token && !isOtpValid) || !isPasswordValid || !doPasswordsMatch}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Set New Password</span>
                  </>
                )}
              </motion.button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] inline-flex items-center gap-1 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>

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
