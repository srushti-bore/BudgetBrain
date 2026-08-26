import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google';
import './globals.css';
import QueryProvider from '../providers/QueryProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import Sidebar from '../components/layout/Sidebar';

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
  title: 'BudgetBrain — Your financial center',
  description: 'Smart, single-user personal finance center with zero friction and dynamic tracking.',
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
            <div className="min-h-screen flex flex-col lg:flex-row">
              <Sidebar />
              <main className="flex-1 lg:pl-64 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                {children}
              </main>
            </div>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
