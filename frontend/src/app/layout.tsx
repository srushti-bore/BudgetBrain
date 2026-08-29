import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google';
import '@/app/globals.css';
import QueryProvider from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { CurrencyProvider } from '@/providers/CurrencyProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import Sidebar from '@/components/layout/Sidebar';
import PWAInstallPrompt from '@/components/layout/PWAInstallPrompt';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BudgetBrain — Your Financial Control Center',
  description: 'Smart, single-user personal finance control center with zero friction and dynamic expense tracking.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BudgetBrain',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${fraunces.variable} suppressHydrationWarning`}>
      <body className="bg-cream text-ink font-sans antialiased min-h-screen">
        <ThemeProvider>
          <QueryProvider>
            <CurrencyProvider>
              <SettingsProvider>
                <div className="min-h-screen flex flex-col lg:flex-row">
                  <Sidebar />
                  <main className="flex-1 lg:ml-64 pt-20 lg:pt-8 p-5 sm:p-8 lg:p-10 lg:px-12 overflow-x-hidden">
                    {children}
                  </main>
                </div>
                <PWAInstallPrompt />
              </SettingsProvider>
            </CurrencyProvider>
          </QueryProvider>
        </ThemeProvider>
        {/* Service Worker Loader */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered successfully:', reg.scope);
                  }, function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
