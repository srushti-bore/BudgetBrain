'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import BrainLogo3D from '@/components/ui/BrainLogo3D';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicPath) {
        router.replace('/login');
      } else if (isAuthenticated && isPublicPath) {
        router.replace('/');
      }
    }
  }, [isLoading, isAuthenticated, isPublicPath, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <div className="relative flex flex-col items-center">
          <div className="w-20 h-20 mb-6 flex items-center justify-center animate-pulse">
            <BrainLogo3D size="lg" />
          </div>
          <h2 className="text-xl font-serif text-[var(--color-text-primary)] font-semibold tracking-wide">
            BudgetBrain
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-primary)] animate-ping" />
            Unlocking your financial vault...
          </p>
        </div>
      </div>
    );
  }

  // If on a private route and unauthenticated, don't flash content before redirect
  if (!isAuthenticated && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
};
