'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<Theme>('dark');

  const applyTheme = (mode: ThemeMode) => {
    let active: Theme = 'dark';
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      active = prefersDark ? 'dark' : 'light';
    } else {
      active = mode;
    }
    setResolvedTheme(active);
    document.documentElement.classList.toggle('dark', active === 'dark');
  };

  useEffect(() => {
    const savedMode = localStorage.getItem('budgetbrain_theme_mode') as ThemeMode | null;
    const legacyTheme = localStorage.getItem('budgetbrain_theme') as Theme | null;

    const initialMode: ThemeMode = savedMode || legacyTheme || 'dark';
    setThemeModeState(initialMode);
    applyTheme(initialMode);

    // Listener for system color scheme changes if mode is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentMode = localStorage.getItem('budgetbrain_theme_mode') as ThemeMode | null;
      if (currentMode === 'system' || !currentMode) {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('budgetbrain_theme_mode', mode);
    applyTheme(mode);
    if (mode !== 'system') {
      localStorage.setItem('budgetbrain_theme', mode);
    }
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = resolvedTheme === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        themeMode,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
