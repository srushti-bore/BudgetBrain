'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type DateFormatOption = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type FirstDayOption = 'monday' | 'sunday';
export type NumberFormatOption = 'indian' | 'international';

export interface SettingsState {
  dateFormat: DateFormatOption;
  firstDayOfWeek: FirstDayOption;
  nearLimitThreshold: number; // 75, 80, 85, 90
  showPredictiveInsights: boolean;
  defaultDailyLimit: number | null;
  numberFormat: NumberFormatOption;
  timezone: string;
}

export interface SettingsContextType extends SettingsState {
  setDateFormat: (format: DateFormatOption) => void;
  setFirstDayOfWeek: (day: FirstDayOption) => void;
  setNearLimitThreshold: (threshold: number) => void;
  setShowPredictiveInsights: (show: boolean) => void;
  setDefaultDailyLimit: (limit: number | null) => void;
  setNumberFormat: (format: NumberFormatOption) => void;
  setTimezone: (tz: string) => void;
  updateSettings: (partial: Partial<SettingsState>) => void;
  formatCustomDate: (dateString: string) => string;
}

const defaultSettings: SettingsState = {
  dateFormat: 'DD/MM/YYYY',
  firstDayOfWeek: 'monday',
  nearLimitThreshold: 80,
  showPredictiveInsights: true,
  defaultDailyLimit: null,
  numberFormat: 'indian',
  timezone: 'Asia/Kolkata',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('budgetbrain_settings');
      let initialTimezone = defaultSettings.timezone;
      try {
        initialTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      } catch {
        // fallback
      }

      if (saved) {
        setSettings({
          ...defaultSettings,
          timezone: initialTimezone,
          ...JSON.parse(saved),
        });
      } else {
        setSettings((prev) => ({ ...prev, timezone: initialTimezone }));
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage', e);
    }
    setIsLoaded(true);
  }, []);

  const saveSettings = (newSettings: SettingsState) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('budgetbrain_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to persist settings', e);
    }
  };

  const setDateFormat = (dateFormat: DateFormatOption) => {
    saveSettings({ ...settings, dateFormat });
  };

  const setFirstDayOfWeek = (firstDayOfWeek: FirstDayOption) => {
    saveSettings({ ...settings, firstDayOfWeek });
  };

  const setNearLimitThreshold = (nearLimitThreshold: number) => {
    saveSettings({ ...settings, nearLimitThreshold });
  };

  const setShowPredictiveInsights = (showPredictiveInsights: boolean) => {
    saveSettings({ ...settings, showPredictiveInsights });
  };

  const setDefaultDailyLimit = (defaultDailyLimit: number | null) => {
    saveSettings({ ...settings, defaultDailyLimit });
  };

  const setNumberFormat = (numberFormat: NumberFormatOption) => {
    saveSettings({ ...settings, numberFormat });
  };

  const setTimezone = (timezone: string) => {
    saveSettings({ ...settings, timezone });
  };

  const updateSettings = (partial: Partial<SettingsState>) => {
    saveSettings({ ...settings, ...partial });
  };

  const formatCustomDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, '0');
    const monthNum = String(date.getMonth() + 1).padStart(2, '0');
    const monthShort = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();

    switch (settings.dateFormat) {
      case 'MM/DD/YYYY':
        return `${monthShort} ${day}, ${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${monthNum}-${day}`;
      case 'DD/MM/YYYY':
      default:
        return `${day} ${monthShort} ${year}`;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setDateFormat,
        setFirstDayOfWeek,
        setNearLimitThreshold,
        setShowPredictiveInsights,
        setDefaultDailyLimit,
        setNumberFormat,
        setTimezone,
        updateSettings,
        formatCustomDate,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
