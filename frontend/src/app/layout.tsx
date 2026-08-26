import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import Sidebar from '@/components/layout/Sidebar';

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
  description: 'Smart, authentic single-user personal expense tracking application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${fraunces.variable}`}>
      <body className="bg-cream dark:bg-[#141C18] text-ink dark:text-cream antialiased transition-colors duration-300">
        <ThemeProvider>
          <QueryProvider>
            <div className="min-h-screen flex flex-col lg:flex-row">
              <Sidebar />
              <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8 min-h-screen">
                {children}
              </main>
            </div>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
