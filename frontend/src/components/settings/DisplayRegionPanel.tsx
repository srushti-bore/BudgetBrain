'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, ThemeMode } from '@/providers/ThemeProvider';
import { useCurrency, AVAILABLE_CURRENCIES, Currency } from '@/providers/CurrencyProvider';
import { useSettings, DateFormatOption, NumberFormatOption } from '@/providers/SettingsProvider';
import { useTranslation } from '@/providers/LanguageProvider';
import { LanguageCode } from '@/lib/translations';
import {
  Palette,
  Sun,
  Moon,
  Laptop,
  Globe,
  Coins,
  Calendar,
  Hash,
  Clock,
  CheckCircle,
  Save,
  Check,
} from 'lucide-react';

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Universal Coordinated Time, +00:00)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT, UTC-05:00)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT, UTC-06:00)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT, UTC-07:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, UTC-08:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST, UTC+00:00/+01:00)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST, UTC+01:00/+02:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST, UTC+01:00/+02:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT, UTC+10:00)' },
];

const DATE_FORMAT_OPTIONS: { value: DateFormatOption; label: string; example: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '29 Aug 2026' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: 'Aug 29, 2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2026-08-29' },
];

const NUMBER_FORMAT_OPTIONS: { value: NumberFormatOption; label: string; example: string }[] = [
  { value: 'indian', label: 'Indian Numbering System', example: '₹1,23,456.78 (Lakhs & Crores)' },
  { value: 'international', label: 'International Numbering System', example: '$123,456.78 (Millions & Billions)' },
];

interface DisplayRegionPanelProps {
  isFullWidth?: boolean;
  onSaveToast?: (message: string) => void;
}

export default function DisplayRegionPanel({
  isFullWidth = false,
  onSaveToast,
}: DisplayRegionPanelProps) {
  const { themeMode, setThemeMode } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const {
    dateFormat,
    setDateFormat,
    firstDayOfWeek,
    setFirstDayOfWeek,
    numberFormat,
    setNumberFormat,
    timezone,
    setTimezone,
    formatCustomDate,
  } = useSettings();
  const { language, setLanguage, languages, t } = useTranslation();

  // Local state for pre-filling with real saved values from context
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency);
  const [selectedDateFormat, setSelectedDateFormat] = useState<DateFormatOption>(dateFormat);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(language);
  const [selectedNumberFormat, setSelectedNumberFormat] = useState<NumberFormatOption>(numberFormat || 'indian');
  const [selectedThemeMode, setSelectedThemeMode] = useState<ThemeMode>(themeMode);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(timezone || 'Asia/Kolkata');
  const [selectedFirstDay, setSelectedFirstDay] = useState<'monday' | 'sunday'>(firstDayOfWeek || 'monday');
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Keep local state in sync when context loads
  useEffect(() => {
    setSelectedCurrency(currency);
  }, [currency]);

  useEffect(() => {
    setSelectedDateFormat(dateFormat);
  }, [dateFormat]);

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  useEffect(() => {
    setSelectedNumberFormat(numberFormat || 'indian');
  }, [numberFormat]);

  useEffect(() => {
    setSelectedThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    setSelectedTimezone(timezone || 'Asia/Kolkata');
  }, [timezone]);

  useEffect(() => {
    setSelectedFirstDay(firstDayOfWeek || 'monday');
  }, [firstDayOfWeek]);

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      setCurrency(selectedCurrency);
      setDateFormat(selectedDateFormat);
      setLanguage(selectedLanguage);
      setNumberFormat(selectedNumberFormat);
      setThemeMode(selectedThemeMode);
      setTimezone(selectedTimezone);
      setFirstDayOfWeek(selectedFirstDay);

      setHasSaved(true);
      setTimeout(() => setHasSaved(false), 3000);

      const msg = t('display_saved_toast', 'Display & Region preferences saved successfully!');
      if (onSaveToast) {
        onSaveToast(msg);
      }
    } catch {
      if (onSaveToast) {
        onSaveToast('Failed to save display preferences.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getLiveTimePreview = (tz: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      }).format(new Date());
    } catch {
      return new Date().toLocaleTimeString();
    }
  };

  return (
    <div
      id="panel-display"
      role="tabpanel"
      aria-labelledby="tab-display"
      className={`glass-card p-5 sm:p-6 space-y-5 shadow-xs hover:shadow-sm transition-all ${
        isFullWidth ? 'lg:col-span-2 max-w-3xl mx-auto w-full' : 'lg:col-span-1'
      }`}
    >
      {/* Panel Header */}
      <div className="flex items-center gap-3 pb-3.5 border-b border-ink/5 dark:border-white/10">
        <div className="w-9 h-9 rounded-xl bg-sage-light dark:bg-sage/15 flex items-center justify-center text-sage border border-sage/20 shrink-0">
          <Palette className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-display font-bold text-base text-ink">
            Display & Region
          </h2>
          <p className="text-[11px] text-ink-muted">
            Manage currency, date format, language and theme preferences
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveChanges} className="space-y-4">
        {/* 1. Theme Toggle (Dark / Light / System) */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-ink uppercase tracking-wider block flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-sage" />
            <span>Theme Toggle</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { mode: 'dark' as ThemeMode, label: 'Dark Slate', subtitle: 'Deep forest', icon: Moon },
              { mode: 'light' as ThemeMode, label: 'Light Mineral', subtitle: 'Warm cream', icon: Sun },
              { mode: 'system' as ThemeMode, label: 'System Sync', subtitle: 'Auto OS mode', icon: Laptop },
            ].map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedThemeMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => setSelectedThemeMode(opt.mode)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-sage bg-sage-light/60 dark:bg-sage/15 text-sage font-bold shadow-xs'
                      : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-sage' : 'text-ink-muted'}`} />
                  <span className="text-xs font-bold block truncate w-full">{opt.label}</span>
                  <span className="text-[9px] text-ink-muted block truncate w-full">{opt.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Language Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-ink uppercase tracking-wider block flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-sage" />
            <span>Interface Language / भाषा</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {languages.slice(0, 4).map((opt) => {
              const isSelected = selectedLanguage === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setSelectedLanguage(opt.code)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-sage bg-sage-light/60 dark:bg-sage/15 text-sage font-bold shadow-xs'
                      : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                  }`}
                >
                  <span className="text-base leading-none">{opt.flag}</span>
                  <span className="text-xs font-bold mt-1 block truncate w-full text-ink dark:text-cream">
                    {opt.nativeName}
                  </span>
                  <span className="text-[9px] text-ink-muted block truncate w-full">{opt.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Regional Formats Grid: Currency & Date Format */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-ink/5 dark:border-white/10">
          {/* Currency */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ink uppercase tracking-wider block flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-sage" />
              <span>Currency</span>
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
              className="w-full p-2 rounded-xl border border-ink/10 dark:border-white/10 text-xs font-semibold cursor-pointer bg-white dark:bg-white/5 text-ink focus:outline-none focus:ring-2 focus:ring-sage/40"
            >
              {AVAILABLE_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Format */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ink uppercase tracking-wider block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sage" />
              <span>Date Format</span>
            </label>
            <select
              value={selectedDateFormat}
              onChange={(e) => setSelectedDateFormat(e.target.value as DateFormatOption)}
              className="w-full p-2 rounded-xl border border-ink/10 dark:border-white/10 text-xs font-semibold cursor-pointer bg-white dark:bg-white/5 text-ink focus:outline-none focus:ring-2 focus:ring-sage/40"
            >
              {DATE_FORMAT_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label} (e.g. {d.example})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Number Format & Timezone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Number format */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ink uppercase tracking-wider block flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-sage" />
              <span>Number Format</span>
            </label>
            <select
              value={selectedNumberFormat}
              onChange={(e) => setSelectedNumberFormat(e.target.value as NumberFormatOption)}
              className="w-full p-2 rounded-xl border border-ink/10 dark:border-white/10 text-xs font-semibold cursor-pointer bg-white dark:bg-white/5 text-ink focus:outline-none focus:ring-2 focus:ring-sage/40"
            >
              {NUMBER_FORMAT_OPTIONS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label} — {n.example}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ink uppercase tracking-wider block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sage" />
              <span>Timezone</span>
            </label>
            <select
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              className="w-full p-2 rounded-xl border border-ink/10 dark:border-white/10 text-xs font-semibold cursor-pointer bg-white dark:bg-white/5 text-ink focus:outline-none focus:ring-2 focus:ring-sage/40"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Preview Summary Bar */}
        <div className="p-3 rounded-xl border border-ink/10 dark:border-white/10 bg-white/60 dark:bg-white/5 flex items-center justify-between text-[11px] text-ink-muted">
          <span>
            Current Time in <strong className="text-ink">{selectedTimezone.split('/')[1] || selectedTimezone}</strong>:
          </span>
          <span className="font-mono font-bold text-xs text-sage">
            {getLiveTimePreview(selectedTimezone)}
          </span>
        </div>

        {/* Save Changes Button Styled like "Save New Password" */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-2 bg-sage hover:bg-sage-dark text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer btn-subtle-shimmer flex items-center justify-center gap-1.5 mt-2"
        >
          {hasSaved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Changes Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
