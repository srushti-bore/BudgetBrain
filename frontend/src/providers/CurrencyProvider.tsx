'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  convertToView: (amountInInr: number) => number;
  convertToBase: (amountInView: number) => number;
  rates: Record<Currency, number>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const FALLBACK_RATES: Record<Currency, number> = {
  INR: 1,
  USD: 0.012019, // ~83.20 INR
  EUR: 0.011086, // ~90.20 INR
  GBP: 0.009496, // ~105.30 INR
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('INR');
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('budgetbrain_currency') as Currency;
    if (saved && ['INR', 'USD', 'EUR', 'GBP'].includes(saved)) {
      setCurrencyState(saved);
    }

    // Fetch live rates
    fetch('https://open.er-api.com/v6/latest/INR')
      .then((res) => {
        if (!res.ok) throw new Error('API rates fetch failed');
        return res.json();
      })
      .then((data) => {
        if (data && data.result === 'success' && data.rates) {
          const apiRates: Record<Currency, number> = {
            INR: 1,
            USD: data.rates.USD || FALLBACK_RATES.USD,
            EUR: data.rates.EUR || FALLBACK_RATES.EUR,
            GBP: data.rates.GBP || FALLBACK_RATES.GBP,
          };
          setRates(apiRates);
        }
      })
      .catch((err) => {
        console.warn('Using fallback exchange rates:', err);
      });
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('budgetbrain_currency', c);
  };

  const convertToView = (amountInInr: number): number => {
    const rate = rates[currency] || FALLBACK_RATES[currency];
    return amountInInr * rate;
  };

  const convertToBase = (amountInView: number): number => {
    const rate = rates[currency] || FALLBACK_RATES[currency];
    return rate > 0 ? amountInView / rate : amountInView;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency: isMounted ? currency : 'INR',
        setCurrency,
        convertToView,
        convertToBase,
        rates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export function useFormatCurrency() {
  const { currency, convertToView } = useCurrency();
  return (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return formatCurrency(0, currency);
    }
    const converted = convertToView(amount);
    return formatCurrency(converted, currency);
  };
}
