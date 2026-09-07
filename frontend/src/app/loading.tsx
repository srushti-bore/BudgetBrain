'use client';

import React from 'react';
import BrainLogo3D from '@/components/ui/BrainLogo3D';

export default function Loading() {
  return (
    <div className="min-h-[70vh] w-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background subtle ambient glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mb-5 flex items-center justify-center animate-pulse">
          <BrainLogo3D size="lg" />
        </div>

        <h2 className="text-lg sm:text-xl font-serif text-[var(--color-text-primary)] font-semibold tracking-wide">
          BudgetBrain
        </h2>

        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-2 flex items-center gap-2 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Unlocking your financial vault...
        </p>
      </div>
    </div>
  );
}
