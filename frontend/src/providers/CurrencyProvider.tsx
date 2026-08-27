'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('INR');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('budgetbrain_currency') as Currency;
    if (saved && ['INR', 'USD', 'EUR', 'GBP'].includes(saved)) {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('budgetbrain_currency', c);
  };

  // Avoid hydration mismatch by waiting until mounted
  return (
    <CurrencyContext.Provider value={{ currency: isMounted ? currency : 'INR', setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

import { formatCurrency } from '@/lib/utils';

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export function useFormatCurrency() {
  const { currency } = useCurrency();
  return (amount: number | null | undefined) => formatCurrency(amount, currency);
}
