'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LanguageCode, SUPPORTED_LANGUAGES, translations } from '@/lib/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  languages: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('budgetbrain_language') as LanguageCode | null;
      if (savedLang && translations[savedLang]) {
        setLanguageState(savedLang);
      }
    } catch (e) {
      console.warn('Failed to load language from localStorage', e);
    }
    setIsLoaded(true);
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    if (!translations[lang]) return;
    setLanguageState(lang);
    try {
      localStorage.setItem('budgetbrain_language', lang);
    } catch (e) {
      console.warn('Failed to persist language in localStorage', e);
    }
  };

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const currentDict = translations[language] || translations.en;
      if (currentDict && currentDict[key]) {
        return currentDict[key];
      }
      // Fallback to English dictionary if key is missing in chosen language
      if (translations.en && translations.en[key]) {
        return translations.en[key];
      }
      return fallback || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, language, setLanguage, languages } = useLanguage();
  return { t, language, setLanguage, languages };
}
