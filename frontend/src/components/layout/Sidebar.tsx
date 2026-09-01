'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Tag, Target, Settings, Menu, X, Sun, Moon, LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/ThemeProvider';
import { useTranslation } from '@/providers/LanguageProvider';
import { useAuth } from '@/providers/AuthProvider';
import BrainLogo3D from '@/components/ui/BrainLogo3D';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/', label: t('nav_dashboard', 'Dashboard'), icon: LayoutDashboard },
    { href: '/expenses', label: t('nav_expenses', 'Expenses'), icon: Receipt },
    { href: '/categories', label: t('nav_categories', 'Categories'), icon: Tag },
    { href: '/budgets', label: t('nav_budgets', 'Budget Goals'), icon: Target },
    { href: '/settings', label: t('nav_settings', 'Settings'), icon: Settings },
  ];

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-cream/90 dark:bg-[#121916]/90 backdrop-blur-md border-b border-ink/5 dark:border-white/10 z-40 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <BrainLogo3D />
          <div>
            <span className="font-display font-bold text-base text-ink dark:text-cream leading-none block">BudgetBrain</span>
            <span className="text-[10px] text-ink-muted leading-none">{t('tagline', 'Your Financial Control Center')}</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {/* Theme Switcher Mobile */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white dark:bg-white/5 border border-ink/10 dark:border-white/10 text-ink dark:text-cream hover:bg-ink/5 transition-colors cursor-pointer"
            aria-label="Toggle Theme"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-ink-muted" /> : <Sun className="w-4 h-4 text-honey" />}
          </button>
          {user && (
            <button
              onClick={() => logout()}
              className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
              aria-label="Sign Out"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl bg-white dark:bg-white/5 border border-ink/10 dark:border-white/10 text-ink dark:text-cream hover:bg-ink/5 transition-colors cursor-pointer"
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
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-[#16201C] border-r border-ink/5 dark:border-white/10 p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div>
          {/* Brand Header */}
          <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3 mb-7 px-2 group">
            <BrainLogo3D />
            <div>
              <h1 className="font-display font-bold text-lg text-ink dark:text-cream tracking-tight group-hover:text-sage transition-colors">
                BudgetBrain
              </h1>
              <p className="text-xs text-ink-muted font-medium">{t('tagline', 'Your Financial Control Center')}</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200',
                    isActive
                      ? 'bg-sage-light dark:bg-sage/15 text-sage shadow-2xs border border-sage/25 font-bold'
                      : 'text-ink-muted hover:text-ink dark:hover:text-cream hover:bg-ink/5 dark:hover:bg-white/5 hover:translate-x-0.5'
                  )}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-sage rounded-r-full" />
                  )}
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-transform duration-200 group-hover:scale-110 shrink-0',
                      isActive ? 'text-sage' : 'text-ink-muted group-hover:text-ink dark:group-hover:text-cream'
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Sign Out at Sidebar Footer */}
        {user && (
          <div className="pt-4 border-t border-ink/5 dark:border-white/10">
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-ink/5 dark:bg-white/5 border border-ink/5 dark:border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink dark:text-cream truncate leading-tight">
                    {user.full_name || 'My Account'}
                  </p>
                  <p className="text-[10px] text-ink-muted truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="p-1.5 rounded-xl text-ink-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
