'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import PWAInstallPrompt from '@/components/layout/PWAInstallPrompt';
import { AuthGuard } from '@/components/auth/AuthGuard';
import AskBudgetBrainChat from '@/components/ai/AskBudgetBrainChat';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <AuthGuard>
      {isAuthRoute ? (
        <main className="min-h-screen w-full">{children}</main>
      ) : (
        <>
          <div className="min-h-screen flex flex-col lg:flex-row">
            <Sidebar />
            <main className="flex-1 lg:ml-64 pt-20 lg:pt-8 p-5 sm:p-8 lg:p-10 lg:px-12 overflow-x-hidden">
              {children}
            </main>
          </div>
          <AskBudgetBrainChat />
        </>
      )}
      <PWAInstallPrompt />
    </AuthGuard>
  );
}

