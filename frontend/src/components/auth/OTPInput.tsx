'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  isError?: boolean;
}

export default function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  isError = false,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(() => {
    const arr = value.split('').slice(0, length);
    while (arr.length < length) arr.push('');
    return arr;
  });

  useEffect(() => {
    const arr = value.split('').slice(0, length);
    while (arr.length < length) arr.push('');
    setDigits(arr);
  }, [value, length]);

  // Focus first empty input on mount
  useEffect(() => {
    if (!disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  const updateDigits = (newDigits: string[]) => {
    setDigits(newDigits);
    const combined = newDigits.join('');
    onChange(combined);
    if (combined.length === length && onComplete) {
      onComplete(combined);
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Allow only numeric digits
    const cleaned = rawVal.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      updateDigits(next);
      return;
    }

    const next = [...digits];
    // If user typed single digit or pasted
    const lastChar = cleaned.slice(-1);
    next[index] = lastChar;
    updateDigits(next);

    // Auto advance
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous and clear it
        inputRefs.current[index - 1]?.focus();
        const next = [...digits];
        next[index - 1] = '';
        updateDigits(next);
      } else {
        const next = [...digits];
        next[index] = '';
        updateDigits(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pastedData) return;

    const next = [...digits];
    for (let i = 0; i < pastedData.length; i++) {
      next[i] = pastedData[i];
    }
    updateDigits(next);

    const targetIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[targetIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
      {Array.from({ length }).map((_, index) => {
        const hasValue = !!digits[index];
        return (
          <motion.div
            key={index}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete="one-time-code"
              disabled={disabled}
              value={digits[index]}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border transition-all duration-200 outline-none select-none ${
                isError
                  ? 'border-red-500/80 bg-red-500/5 text-red-500 ring-2 ring-red-500/20'
                  : hasValue
                  ? 'border-emerald-500/90 bg-emerald-500/[0.04] text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/25 shadow-sm shadow-emerald-500/10 scale-[1.02]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-500/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
