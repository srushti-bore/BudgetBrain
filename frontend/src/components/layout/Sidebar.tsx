'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Tag, Target, Menu, X, Brain, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/ThemeProvider';
import { useCurrency } from '@/providers/CurrencyProvider';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/budgets', label: 'Budget Goals', icon: Target },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-cream/90 dark:bg-[#121916]/90 backdrop-blur-md border-b border-ink/5 dark:border-white/10 z-40 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sage/15 flex items-center justify-center text-sage border border-sage/20">
            <Brain className="w-5 h-5 text-sage" />
          </div>
          <div>
            <span className="font-display font-bold text-base text-ink dark:text-cream leading-none block">BudgetBrain</span>
            <span className="text-[10px] text-ink-muted leading-none">Your Financial Control Center</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {/* Theme Switcher Mobile */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white dark:bg-white/5 border border-ink/10 dark:border-white/10 text-ink dark:text-cream hover:bg-ink/5 transition-colors"
            aria-label="Toggle Theme"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-ink-muted" /> : <Sun className="w-4 h-4 text-honey" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl bg-white dark:bg-white/5 border border-ink/10 dark:border-white/10 text-ink dark:text-cream hover:bg-ink/5 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Overlay for mobile drawer */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-ink/20 dark:bg-black/40 backdrop-blur-xs z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-[#16201C] border-r border-ink/5 dark:border-white/10 p-6 flex flex-col justify-between transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div>
          {/* Brand Header */}
          <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3 mb-8 px-2 group">
            <div className="w-10 h-10 rounded-xl bg-sage/15 flex items-center justify-center text-sage border border-sage/20 group-hover:scale-102 transition-transform">
              <Brain className="w-5 h-5 text-sage" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-ink dark:text-cream tracking-tight">BudgetBrain</h1>
              <p className="text-xs text-ink-muted font-medium">Your Financial Control Center</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-200',
                    isActive
                      ? 'bg-sage-light dark:bg-sage/15 text-sage font-bold shadow-2xs border border-sage/20'
                      : 'text-ink-muted hover:text-ink dark:hover:text-cream hover:bg-ink/5 dark:hover:bg-white/5'
                  )}
                >
                  <Icon className={cn('w-4 h-4 md:w-5 md:h-5', isActive ? 'text-sage' : 'text-ink-muted')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer with Theme Switcher & Info */}
        <div className="pt-5 border-t border-ink/5 dark:border-white/10 space-y-2.5 px-1">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-cream dark:bg-white/5 border border-ink/8 dark:border-white/10 text-xs font-medium text-ink dark:text-cream hover:bg-ink/5 dark:hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-honey" />
              ) : (
                <Moon className="w-4 h-4 text-sky" />
              )}
              <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <span className="text-[10px] text-ink-muted font-mono uppercase bg-white dark:bg-white/10 px-2 py-0.5 rounded border border-ink/5 dark:border-white/10">
              {theme}
            </span>
          </button>

          <div className="bg-cream dark:bg-white/5 border border-ink/5 dark:border-white/10 rounded-xl p-3 text-xs text-ink-muted space-y-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="currency-select" className="font-semibold text-ink dark:text-cream text-[10px] uppercase tracking-wider">Base Currency</label>
              <select
                id="currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full mt-0.5 px-2 py-1 rounded-lg bg-white dark:bg-[#16201C] border border-ink/15 dark:border-white/15 text-xs font-bold text-ink dark:text-cream focus:outline-none focus:border-sage transition-all cursor-pointer"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <span className="block text-[10px] text-ink-muted leading-tight">Authentication Free MVP</span>
          </div>
        </div>
      </aside>
    </>
  );
}
