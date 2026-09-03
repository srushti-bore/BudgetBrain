'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, UserPlus, ArrowRight, ShieldCheck, Check, X, Send, RefreshCw, KeyRound, Edit3 } from 'lucide-react';
import BrainLogo3D from '@/components/ui/BrainLogo3D';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import OTPInput from '@/components/auth/OTPInput';
import { useAuth } from '@/providers/AuthProvider';
import { authApi } from '@/lib/api';
import { suggestEmailCorrection } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const { verifyOtp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-registration OTP state
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isOtpSuccess, setIsOtpSuccess] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  // Email format regex validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber;

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isPasswordValid) {
      setError('Please satisfy all password security requirements before proceeding.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await authApi.register({
        email: email.trim(),
        password,
        full_name: fullName.trim() || undefined,
      });
      setRegisteredEmail(email.trim());
      setIsRegistered(true);
      setResendCooldown(60);
      setOtp('');
      setOtpError(null);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Registration failed. Please check your information.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (inputOtp?: string) => {
    const code = (inputOtp || otp).trim();
    if (code.length !== 6 || isVerifyingOtp || isOtpSuccess) return;

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      await verifyOtp(registeredEmail, code);
      setIsOtpSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Invalid verification code. Please check and try again.';
      setOtpError(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    setOtpError(null);
    try {
      const res = await authApi.resendOtp(registeredEmail || email.trim());
      setResendStatus(res.message || 'New 6-digit code sent successfully!');
      setResendCooldown(60);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to resend code.';
      setResendStatus(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[var(--color-bg)] relative overflow-hidden">
      {/* Background ambient decorative blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-7 sm:p-9 shadow-2xl border border-white/10 dark:border-white/5 relative z-10 backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 mb-2.5 flex items-center justify-center">
              <BrainLogo3D size="sm" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[var(--color-text-primary)] tracking-tight">
              {isRegistered ? 'Enter Verification Code' : 'Create Your Vault'}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Private, End-to-End Multi-Tenant Financial Hub
            </p>
          </div>

          <AnimatePresence mode="wait">
            {isRegistered ? (
              /* Step 2: 6-Digit OTP Verification Screen */
              <motion.div
                key="otp-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1.5">
                  <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                    We sent a 6-digit verification code to:
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold">
                    <span>{registeredEmail}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistered(false);
                        setIsOtpSuccess(false);
                        setOtp('');
                        setOtpError(null);
                      }}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                      title="Change email"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 6-Box Segmented OTP Input */}
                <div className="pt-2">
                  <OTPInput
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      setOtpError(null);
                    }}
                    onComplete={(val) => handleVerifyOtp(val)}
                    disabled={isVerifyingOtp || isOtpSuccess}
                    isError={!!otpError}
                  />
                </div>

                {/* OTP Error Message */}
                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-center font-medium"
                  >
                    {otpError}
                  </motion.div>
                )}

                {/* Resend Status Notification */}
                {resendStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs text-center font-medium"
                  >
                    {resendStatus}
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    disabled={otp.length !== 6 || isVerifyingOtp || isOtpSuccess}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : isOtpSuccess ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Code Verified! Entering Vault...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Unlock Vault</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isResending || isOtpSuccess}
                      className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                    </button>

                    <Link
                      href="/login"
                      className="text-[var(--color-primary)] hover:underline font-medium"
                    >
                      Already verified? Sign In &rarr;
                    </Link>
                  </div>
                </div>

                <div className="pt-2 text-center text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  💡 Tip: You can also click the activation link in your email if you prefer.
                </div>
              </motion.div>
            ) : (
              /* Registration Form State */
              <motion.div
                key="register-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm leading-relaxed"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
                      Full Name (Optional)
                    </label>
                    <div className="relative flex items-center">
                      <UserIcon className="absolute left-3.5 w-4 h-4 text-[var(--color-text-muted)]" />
                      <input
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Mercer"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all placeholder:text-[var(--color-text-muted)]/60"
                      />
                    </div>
                  </div>

                  {/* Email Field with Live Green Validation & Smart Typo Detection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      {email.length > 0 && (
                        <span
                          className={`text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                            suggestEmailCorrection(email)
                              ? 'text-amber-500'
                              : isEmailValid
                              ? 'text-emerald-500'
                              : 'text-amber-500'
                          }`}
                        >
                          {suggestEmailCorrection(email) ? (
                            <span>Check domain spelling</span>
                          ) : isEmailValid ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Valid Email</span>
                            </>
                          ) : (
                            <span>Enter valid email</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <Mail
                        className={`absolute left-3.5 w-4 h-4 transition-colors ${
                          email.length > 0 && isEmailValid && !suggestEmailCorrection(email)
                            ? 'text-emerald-500'
                            : 'text-[var(--color-text-muted)]'
                        }`}
                      />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--color-surface)] border text-[var(--color-text-primary)] text-sm focus:outline-none transition-all placeholder:text-[var(--color-text-muted)]/60 ${
                          email.length > 0 && suggestEmailCorrection(email)
                            ? 'border-amber-500/80 ring-2 ring-amber-500/20 bg-amber-500/[0.02]'
                            : email.length > 0 && isEmailValid
                            ? 'border-emerald-500/80 ring-2 ring-emerald-500/20 bg-emerald-500/[0.02]'
                            : email.length > 0 && !isEmailValid
                            ? 'border-amber-500/60 focus:ring-2 focus:ring-amber-500/20'
                            : 'border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-primary)]/40'
                        }`}
                      />
                      {email.length > 0 && (
                        <div className="absolute right-3">
                          {suggestEmailCorrection(email) ? (
                            <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
                              <span className="text-[10px] font-bold">!</span>
                            </div>
                          ) : isEmailValid ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                              <span className="text-[10px] font-bold">!</span>
                            </div>
                          )}
                        </div>
                      )}
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
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

                    {/* Password Requirement Checklist */}
                    {password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] grid grid-cols-2 gap-1.5"
                      >
                        <span
                          className={`flex items-center gap-1 ${
                            hasMinLength ? 'text-emerald-500 font-medium' : 'text-zinc-500'
                          }`}
                        >
                          {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} 8+ Characters
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            hasUpper ? 'text-emerald-500 font-medium' : 'text-zinc-500'
                          }`}
                        >
                          {hasUpper ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Uppercase (A-Z)
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            hasLower ? 'text-emerald-500 font-medium' : 'text-zinc-500'
                          }`}
                        >
                          {hasLower ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Lowercase (a-z)
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            hasNumber ? 'text-emerald-500 font-medium' : 'text-zinc-500'
                          }`}
                        >
                          {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Number (0-9)
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={isSubmitting || !isEmailValid || !isPasswordValid}
                    className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending Verification Link...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Account</span>
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-[var(--color-border)] opacity-60" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] select-none shrink-0">
                    Or sign up with
                  </span>
                  <div className="h-px flex-1 bg-[var(--color-border)] opacity-60" />
                </div>

                {/* Google OAuth Button */}
                <GoogleAuthButton text="signup_with" onError={(msg) => setError(msg)} />

                {/* Footer Note */}
                <div className="mt-6 text-center">
                  <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                    Already have an account?{' '}
                    <Link
                      href="/login"
                      className="text-[var(--color-primary)] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Sign In <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
