'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/providers/ThemeProvider';
import { useCurrency } from '@/providers/CurrencyProvider';
import { useSettings, DateFormatOption } from '@/providers/SettingsProvider';
import { useTranslation } from '@/providers/LanguageProvider';
import { categoryApi, expenseApi, budgetApi, API_BASE_URL } from '@/lib/api';
import { exportExpensesToCSV, exportFullBackupJSON, validateBackupJSON } from '@/lib/exportUtils';
import { useAuth } from '@/providers/AuthProvider';
import {
  Settings,
  Palette,
  Sliders,
  Database,
  Sun,
  Moon,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Activity,
  FileSpreadsheet,
  Trash2,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Wifi,
  ShieldAlert,
  Globe,
  ShieldCheck,
  KeyRound,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  LayoutGrid,
} from 'lucide-react';

const starterCategories = [
  'Food & Dining',
  'Transportation',
  'Housing & Rent',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Education',
  'Miscellaneous',
];

const SECTIONS = [
  { id: 'all', label: 'All Sections', icon: LayoutGrid },
  { id: 'display', label: 'Display & Region', icon: Palette },
  { id: 'budgets', label: 'Budget & Alerts', icon: Sliders },
  { id: 'account', label: 'Account & Security', icon: ShieldCheck },
  { id: 'data', label: 'Data & Backup', icon: Database },
  { id: 'system', label: 'System & Health', icon: Activity },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { user, changePassword, logoutAll, logout } = useAuth();
  const {
    dateFormat,
    setDateFormat,
    firstDayOfWeek,
    setFirstDayOfWeek,
    nearLimitThreshold,
    setNearLimitThreshold,
    showPredictiveInsights,
    setShowPredictiveInsights,
    formatCustomDate,
  } = useSettings();
  const { t, language, setLanguage, languages } = useTranslation();

  const [activeSection, setActiveSection] = useState<SectionId>('all');
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Password & Session State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmNewPass, setShowConfirmNewPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Health Ping State
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    database: string;
    latency: number;
    lastChecked: string;
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Danger Zone Modals
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearInputText, setClearInputText] = useState('');
  const [isClearingExpenses, setIsClearingExpenses] = useState(false);

  const [showResetCatModal, setShowResetCatModal] = useState(false);
  const [resetCatInputText, setResetCatInputText] = useState('');
  const [isResettingCategories, setIsResettingCategories] = useState(false);

  // Health Ping Function
  const checkHealth = async () => {
    setIsCheckingHealth(true);
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus({
          status: data.status || 'ok',
          database: data.database || 'connected',
          latency,
          lastChecked: new Date().toLocaleTimeString(),
        });
      } else {
        setHealthStatus({
          status: 'error',
          database: 'disconnected',
          latency,
          lastChecked: new Date().toLocaleTimeString(),
        });
      }
    } catch {
      setHealthStatus({
        status: 'error',
        database: 'unreachable',
        latency: 0,
        lastChecked: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSelectSection = (id: SectionId) => {
    setActiveSection(id);
    if (id !== 'all') {
      setTimeout(() => {
        const el = document.getElementById(`section-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  // CSV Export Handler
  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const res = await expenseApi.list({ page_size: 1000 });
      const expenses = res.data || [];
      if (expenses.length === 0) {
        showToast('No expenses found to export.', 'error');
        return;
      }
      exportExpensesToCSV(expenses, currency);
      showToast(`Exported ${expenses.length} expenses to CSV!`);
    } catch {
      showToast('Failed to export expenses.', 'error');
    } finally {
      setIsExportingCSV(false);
    }
  };

  // Full Backup Export Handler
  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    try {
      const [categories, expensesRes, budgets] = await Promise.all([
        categoryApi.list(),
        expenseApi.list({ page_size: 1000 }),
        budgetApi.list(),
      ]);
      exportFullBackupJSON({
        categories: categories || [],
        expenses: expensesRes.data || [],
        budgets: budgets || [],
      });
      showToast('Full database backup JSON created and downloaded!');
    } catch {
      showToast('Failed to create database backup.', 'error');
    } finally {
      setIsExportingJSON(false);
    }
  };

  // Restore Backup Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const validation = validateBackupJSON(content);
      if (!validation.isValid || !validation.data) {
        showToast(validation.error || 'Invalid backup file format.', 'error');
        return;
      }

      showToast(`Backup verified! Contains ${validation.data.expenses.length} expenses and ${validation.data.categories.length} categories.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clear All Expenses Handler
  const handleExecuteClearExpenses = async () => {
    if (clearInputText !== 'DELETE') return;
    setIsClearingExpenses(true);
    try {
      const res = await expenseApi.list({ page_size: 1000 });
      const expenses = res.data || [];
      for (const exp of expenses) {
        await expenseApi.delete(exp.id);
      }
      showToast(`Successfully deleted ${expenses.length} expenses!`);
      setShowClearModal(false);
      setClearInputText('');
    } catch {
      showToast('Failed to clear some expenses.', 'error');
    } finally {
      setIsClearingExpenses(false);
    }
  };

  // Reset Categories Handler
  const handleExecuteResetCategories = async () => {
    if (resetCatInputText !== 'RESET') return;
    setIsResettingCategories(true);
    try {
      const existing = await categoryApi.list();
      const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

      let createdCount = 0;
      for (const catName of starterCategories) {
        if (!existingNames.has(catName.toLowerCase())) {
          await categoryApi.create({ name: catName });
          createdCount++;
        }
      }
      showToast(`Starter categories verified! Added ${createdCount} missing starter categories.`);
      setShowResetCatModal(false);
      setResetCatInputText('');
    } catch {
      showToast('Failed to reset starter categories.', 'error');
    } finally {
      setIsResettingCategories(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Toast Notification (Center Top) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 sm:top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold border backdrop-blur-md transition-all ${
              toastMessage.type === 'success'
                ? 'bg-sage-light text-sage border-sage/40 dark:bg-sage/20 dark:text-sage shadow-sage/10'
                : 'bg-coral-light text-coral border-coral/40 dark:bg-coral/20 dark:text-coral shadow-coral/10'
            }`}
          >
            {toastMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-ink/5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sage-light dark:bg-sage/15 flex items-center justify-center text-sage border border-sage/20">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              Settings & Preferences
            </h1>
          </div>
          <p className="text-xs md:text-sm text-ink-muted mt-1 font-medium">
            Manage display formats, alert thresholds, account credentials, backups, and system telemetry.
          </p>
        </div>
      </div>

      {/* Section Filter & Jump Pills */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-ink/5 dark:bg-white/5 border border-ink/5 dark:border-white/10 sticky top-2 z-20 backdrop-blur-md">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleSelectSection(sec.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-white dark:bg-[#17211d] text-sage shadow-xs border border-sage/25 font-bold'
                  : 'text-ink-muted hover:text-ink dark:hover:text-cream hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sage' : 'text-ink-muted'}`} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Clean Grid / Card Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ========================================================================= */}
        {/* 1. Display & Region Card (Card 1 in 2-column grid) */}
        {/* ========================================================================= */}
        {(activeSection === 'all' || activeSection === 'display') && (
          <motion.div
            id="section-display"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-5 sm:p-6 space-y-5 shadow-xs hover:shadow-sm transition-all ${
              activeSection === 'display' ? 'lg:col-span-2 max-w-3xl mx-auto w-full' : 'lg:col-span-1'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center gap-3 pb-3.5 border-b border-ink/5 dark:border-white/10">
              <div className="w-9 h-9 rounded-xl bg-sage-light dark:bg-sage/15 flex items-center justify-center text-sage border border-sage/20 shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink">
                  Display & Region
                </h2>
                <p className="text-[11px] text-ink-muted">
                  Visual theme, interface language, currency & dates
                </p>
              </div>
            </div>

            {/* Visual Theme Mode */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-ink uppercase tracking-wider block">
                Visual Theme Mode
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => { if (theme !== 'light') toggleTheme(); }}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                    theme === 'light'
                      ? 'border-sage bg-sage-light/60 dark:bg-sage/10 text-sage font-bold shadow-xs'
                      : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-honey/15 flex items-center justify-center text-honey shrink-0">
                      <Sun className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs block font-bold truncate">Light Mineral</span>
                      <span className="text-[10px] text-ink-muted font-normal block truncate">Warm cream</span>
                    </div>
                  </div>
                  {theme === 'light' && <CheckCircle className="w-3.5 h-3.5 text-sage shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                    theme === 'dark'
                      ? 'border-sage bg-sage-light/60 dark:bg-sage/10 text-sage font-bold shadow-xs'
                      : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-sky/15 flex items-center justify-center text-sky shrink-0">
                      <Moon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs block font-bold truncate">Dark Slate</span>
                      <span className="text-[10px] text-ink-muted font-normal block truncate">Deep forest</span>
                    </div>
                  </div>
                  {theme === 'dark' && <CheckCircle className="w-3.5 h-3.5 text-sage shrink-0" />}
                </button>
              </div>
            </div>

            {/* Interface Language */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sage" />
                <span className="text-[11px] font-bold text-ink uppercase tracking-wider">
                  {t('language_selection', 'Interface Language / भाषा')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {languages.map((opt) => {
                  const isSelected = language === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => {
                        setLanguage(opt.code);
                        showToast(`Language switched to ${opt.nativeName}`);
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center text-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-sage bg-sage-light/60 dark:bg-sage/15 text-sage font-bold shadow-xs'
                          : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                      }`}
                    >
                      <span className="text-lg leading-none">{opt.flag}</span>
                      <span className="text-xs font-bold mt-1 block truncate w-full text-ink dark:text-cream">
                        {opt.nativeName}
                      </span>
                      <span className="text-[9px] text-ink-muted block truncate w-full">{opt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Regional Formats: Currency & Date Format */}
            <div className="pt-2 border-t border-ink/5 dark:border-white/10 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Active Currency */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ink uppercase tracking-wider block">
                    Display Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-ink/10 dark:border-white/10 text-xs font-semibold cursor-pointer bg-white dark:bg-white/5 text-ink"
                  >
                    <option value="INR">INR (₹) — Indian Rupee</option>
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                  </select>
                </div>

                {/* Date Format */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ink uppercase tracking-wider block">
                    Date Format
                  </label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value as DateFormatOption)}
                    className="w-full p-2 rounded-xl border border-ink/10 dark:border-white/10 text-xs font-semibold cursor-pointer bg-white dark:bg-white/5 text-ink"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (29 Aug 2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (Aug 29, 2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-08-29)</option>
                  </select>
                </div>
              </div>

              {/* First Day of Week */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-ink uppercase tracking-wider block">
                    First Day of Week
                  </label>
                  <span className="text-[10px] text-ink-muted">
                    Preview: <strong className="text-ink">{formatCustomDate(new Date().toISOString())}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFirstDayOfWeek('monday')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      firstDayOfWeek === 'monday'
                        ? 'bg-sage-light text-sage border-sage/40 dark:bg-sage/15 shadow-xs'
                        : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                    }`}
                  >
                    Monday
                  </button>
                  <button
                    type="button"
                    onClick={() => setFirstDayOfWeek('sunday')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      firstDayOfWeek === 'sunday'
                        ? 'bg-sage-light text-sage border-sage/40 dark:bg-sage/15 shadow-xs'
                        : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                    }`}
                  >
                    Sunday
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 2. Budget & Alerts Card (Card 2 in 2-column grid) */}
        {/* ========================================================================= */}
        {(activeSection === 'all' || activeSection === 'budgets') && (
          <motion.div
            id="section-budgets"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-5 sm:p-6 space-y-5 shadow-xs hover:shadow-sm transition-all ${
              activeSection === 'budgets' ? 'lg:col-span-2 max-w-3xl mx-auto w-full' : 'lg:col-span-1'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center gap-3 pb-3.5 border-b border-ink/5 dark:border-white/10">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center text-honey border border-amber-500/20 shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink">
                  Budget & Alerts
                </h2>
                <p className="text-[11px] text-ink-muted">
                  Threshold limits, warning alerts & predictive widgets
                </p>
              </div>
            </div>

            {/* Threshold Slider & Input */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label htmlFor="custom-threshold-input" className="text-[11px] font-bold text-ink uppercase tracking-wider block">
                    Near Limit Alert Threshold
                  </label>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    Percentage when warnings and badges trigger
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    id="custom-threshold-input"
                    type="number"
                    min={1}
                    max={99}
                    value={nearLimitThreshold}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        setNearLimitThreshold(Math.max(1, Math.min(99, val)));
                      }
                    }}
                    className="w-16 px-2 py-1 rounded-xl bg-white dark:bg-white/10 border-2 border-honey/50 text-right font-display font-bold text-sm text-ink focus:outline-none focus:border-honey"
                  />
                  <span className="ml-1.5 font-bold text-xs text-honey">%</span>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={1}
                  max={99}
                  step={1}
                  value={nearLimitThreshold}
                  onChange={(e) => setNearLimitThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-ink/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-honey"
                />
                <div className="flex justify-between text-[10px] text-ink-muted font-semibold">
                  <span>1% (Early)</span>
                  <span className="text-honey font-bold">Active: {nearLimitThreshold}%</span>
                  <span>99% (Late)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                  Quick Presets
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[50, 65, 75, 80, 90].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNearLimitThreshold(val)}
                      className={`py-1 rounded-lg border text-center transition-all cursor-pointer text-xs ${
                        nearLimitThreshold === val
                          ? 'bg-honey-light text-honey border-honey/50 dark:bg-honey/20 font-bold shadow-xs'
                          : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink font-semibold'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Trigger Preview Pill */}
              <div className="p-3 rounded-xl bg-honey-light/40 dark:bg-honey/10 border border-honey/30 text-[11px] leading-relaxed text-ink-muted flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-honey shrink-0 mt-0.5" />
                <span>
                  At <strong className="text-ink font-bold">{nearLimitThreshold}%</strong>, BudgetBrain displays the <span className="inline-flex items-center font-bold text-honey bg-honey-light dark:bg-honey/20 px-1 py-0.2 rounded border border-honey/30 text-[9px]">⚠️ Near Limit</span> warning on category cards.
                </span>
              </div>
            </div>

            <hr className="border-ink/5 dark:border-white/10" />

            {/* Predictive Insights Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-honey" />
                  Predictive Health Widget
                </span>
                <span className="text-[10px] text-ink-muted block mt-0.5">
                  Extrapolate monthly spend and show health score on Dashboard
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPredictiveInsights(!showPredictiveInsights)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showPredictiveInsights ? 'bg-sage' : 'bg-ink/20 dark:bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    showPredictiveInsights ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 3. Account & Security Card (Card 3 in 2-column grid) */}
        {/* ========================================================================= */}
        {(activeSection === 'all' || activeSection === 'account') && (
          <motion.div
            id="section-account"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-5 sm:p-6 space-y-5 shadow-xs hover:shadow-sm transition-all ${
              activeSection === 'account' ? 'lg:col-span-2 max-w-3xl mx-auto w-full' : 'lg:col-span-1'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center gap-3 pb-3.5 border-b border-ink/5 dark:border-white/10">
              <div className="w-9 h-9 rounded-xl bg-sage-light dark:bg-sage/15 flex items-center justify-center text-sage border border-sage/20 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink">
                  Account & Security
                </h2>
                <p className="text-[11px] text-ink-muted">
                  Tenant profile credentials, sessions & password updates
                </p>
              </div>
            </div>

            {/* Profile Overview & Session Actions */}
            <div className="p-3.5 rounded-xl border border-ink/10 dark:border-white/10 bg-white/60 dark:bg-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                  Account Identity
                </span>
                {user?.is_verified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    Verified ✓
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[9px] font-bold">
                    Unverified
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink font-mono truncate">{user?.email || 'N/A'}</p>
                <span className="text-[10px] text-ink-muted truncate shrink-0">{user?.full_name || 'Personal'}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-ink/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex-1 py-1.5 px-2 rounded-lg border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink hover:bg-ink/5 dark:hover:bg-white/5 transition-all inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3 text-ink-muted" />
                  <span>Sign Out</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoggingOutAll(true);
                    try {
                      await logoutAll();
                      showToast('Logged out from all devices!');
                    } catch {
                      showToast('Failed to logout from all devices.', 'error');
                    } finally {
                      setIsLoggingOutAll(false);
                    }
                  }}
                  disabled={isLoggingOutAll}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold transition-all inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>{isLoggingOutAll ? 'Revoking...' : 'Revoke All'}</span>
                </button>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="p-4 rounded-xl border border-ink/10 dark:border-white/10 bg-white/60 dark:bg-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-sage" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-ink">Change Password</h3>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const hasMin = newPassword.length >= 8;
                  const hasUp = /[A-Z]/.test(newPassword);
                  const hasLow = /[a-z]/.test(newPassword);
                  const hasNum = /[0-9]/.test(newPassword);
                  const isValid = hasMin && hasUp && hasLow && hasNum;

                  if (!isValid) {
                    showToast('Please satisfy all password security requirements.', 'error');
                    return;
                  }
                  if (newPassword !== confirmNewPassword) {
                    showToast('New passwords do not match.', 'error');
                    return;
                  }
                  setIsUpdatingPassword(true);
                  try {
                    await changePassword(currentPassword, newPassword);
                    showToast('Password updated successfully! Please sign in again.');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  } catch (err: any) {
                    showToast(err.response?.data?.error?.message || err.message || 'Failed to update password.', 'error');
                  } finally {
                    setIsUpdatingPassword(false);
                  }
                }}
                className="space-y-2.5"
              >
                {/* Current Password */}
                <div>
                  <label className="block text-[10px] font-semibold text-ink-muted mb-1">
                    Current Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-2.5 w-3.5 h-3.5 text-ink-muted" />
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-ink/10 dark:border-white/10 text-xs bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-sage/40 text-ink"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-2 text-ink-muted p-1 cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[10px] font-semibold text-ink-muted mb-1">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-2.5 w-3.5 h-3.5 text-ink-muted" />
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-ink/10 dark:border-white/10 text-xs bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-sage/40 text-ink"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2 text-ink-muted p-1 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Requirements Badges */}
                  {newPassword.length > 0 && (
                    <div className="mt-1.5 p-1.5 rounded-lg bg-ink/5 dark:bg-white/5 text-[9px] grid grid-cols-2 gap-1">
                      <span className={newPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-muted'}>
                        {newPassword.length >= 8 ? '✓' : '•'} 8+ Characters
                      </span>
                      <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-muted'}>
                        {/[A-Z]/.test(newPassword) ? '✓' : '•'} Uppercase (A-Z)
                      </span>
                      <span className={/[a-z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-muted'}>
                        {/[a-z]/.test(newPassword) ? '✓' : '•'} Lowercase (a-z)
                      </span>
                      <span className={/[0-9]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-muted'}>
                        {/[0-9]/.test(newPassword) ? '✓' : '•'} Number (0-9)
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-[10px] font-semibold text-ink-muted mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-2.5 w-3.5 h-3.5 text-ink-muted" />
                    <input
                      type={showConfirmNewPass ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-ink/10 dark:border-white/10 text-xs bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-sage/40 text-ink"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPass(!showConfirmNewPass)}
                      className="absolute right-2 text-ink-muted p-1 cursor-pointer"
                    >
                      {showConfirmNewPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isUpdatingPassword ||
                    !currentPassword ||
                    newPassword.length < 8 ||
                    newPassword !== confirmNewPassword
                  }
                  className="w-full py-2 bg-sage hover:bg-sage-dark text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer btn-subtle-shimmer"
                >
                  {isUpdatingPassword ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 4. Data & Backup Card (Card 4 in 2-column grid) */}
        {/* ========================================================================= */}
        {(activeSection === 'all' || activeSection === 'data') && (
          <motion.div
            id="section-data"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-5 sm:p-6 space-y-5 shadow-xs hover:shadow-sm transition-all ${
              activeSection === 'data' ? 'lg:col-span-2 max-w-3xl mx-auto w-full' : 'lg:col-span-1'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center gap-3 pb-3.5 border-b border-ink/5 dark:border-white/10">
              <div className="w-9 h-9 rounded-xl bg-sky/10 dark:bg-sky/15 flex items-center justify-center text-sky border border-sky/20 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink">
                  Data & Backup
                </h2>
                <p className="text-[11px] text-ink-muted">
                  Exports, integrity inspection & database maintenance
                </p>
              </div>
            </div>

            {/* Export Actions Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* CSV Export */}
              <div className="p-3 rounded-xl border border-ink/10 dark:border-white/10 bg-white/60 dark:bg-white/5 space-y-2 flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sage-light dark:bg-sage/15 flex items-center justify-center text-sage shrink-0">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-ink truncate">Expenses CSV</h3>
                    <span className="text-[9px] text-ink-muted block truncate">Spreadsheet</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={isExportingCSV}
                  className="w-full py-1.5 bg-sage hover:bg-sage-dark disabled:opacity-50 text-white font-semibold text-[11px] rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer btn-subtle-shimmer"
                >
                  <Download className="w-3 h-3" />
                  <span>{isExportingCSV ? 'Generating...' : 'Export CSV'}</span>
                </button>
              </div>

              {/* JSON Backup */}
              <div className="p-3 rounded-xl border border-ink/10 dark:border-white/10 bg-white/60 dark:bg-white/5 space-y-2 flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-light dark:bg-sky/15 flex items-center justify-center text-sky shrink-0">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-ink truncate">Full Snapshot</h3>
                    <span className="text-[9px] text-ink-muted block truncate">JSON Backup</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  disabled={isExportingJSON}
                  className="w-full py-1.5 bg-sage/90 hover:bg-sage-dark disabled:opacity-50 text-white font-semibold text-[11px] rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer btn-subtle-shimmer"
                >
                  <Download className="w-3 h-3" />
                  <span>{isExportingJSON ? 'Exporting...' : 'Backup JSON'}</span>
                </button>
              </div>
            </div>

            {/* Inspect / Verify JSON Backup */}
            <div className="p-3 rounded-xl border border-dashed border-ink/15 dark:border-white/15 bg-ink/2 dark:bg-white/2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-ink flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-sage shrink-0" />
                  <span>Verify Backup Snapshot</span>
                </h4>
                <span className="text-[10px] text-ink-muted block truncate">
                  Inspect an exported JSON backup without modifying data.
                </span>
              </div>
              <label className="px-3 py-1.5 bg-ink/5 dark:bg-white/10 hover:bg-ink/10 text-ink font-semibold text-xs rounded-lg cursor-pointer transition-colors shrink-0">
                <span>Inspect</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Danger Zone */}
            <div className="p-3.5 rounded-xl border border-coral/30 bg-coral-light/20 dark:bg-coral/5 space-y-2.5">
              <div className="flex items-center gap-2 text-coral">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Database Maintenance</h3>
              </div>
              <p className="text-[10px] text-ink-muted leading-relaxed">
                Purge test transactions or restore missing starter categories with confirmation guards.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowClearModal(true)}
                  className="p-2 rounded-lg border border-coral/30 bg-white/70 dark:bg-white/5 text-coral font-semibold text-xs flex items-center justify-center gap-1 hover:bg-coral hover:text-white transition-all cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Expenses</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetCatModal(true)}
                  className="p-2 rounded-lg border border-honey/40 bg-white/70 dark:bg-white/5 text-honey font-semibold text-xs flex items-center justify-center gap-1 hover:bg-honey hover:text-white transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore Categories</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 5. System & Health Card (Card 5 spanning 2 columns across the base) */}
        {/* ========================================================================= */}
        {(activeSection === 'all' || activeSection === 'system') && (
          <motion.div
            id="section-system"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 sm:p-6 space-y-5 shadow-xs hover:shadow-sm transition-all lg:col-span-2"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-ink/5 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage-light dark:bg-sage/15 flex items-center justify-center text-sage border border-sage/20 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-ink">
                    System & Health
                  </h2>
                  <p className="text-[11px] text-ink-muted">
                    Real-time API connectivity telemetry and runtime platform infrastructure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={checkHealth}
                disabled={isCheckingHealth}
                className="px-3 py-1.5 rounded-xl bg-ink/5 dark:bg-white/10 hover:bg-ink/10 text-xs font-semibold text-ink transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Wifi className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                <span>{isCheckingHealth ? 'Pinging...' : 'Re-Check'}</span>
              </button>
            </div>

            {/* 2-Column Telemetry & Infrastructure Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column: Connectivity Metrics */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                  Live Service Status
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/5 dark:border-white/10 text-center">
                    <span className="text-[9px] text-ink-muted font-bold uppercase tracking-wider block">Server</span>
                    <span className="text-xs font-bold text-sage flex items-center justify-center gap-1 mt-1">
                      <CheckCircle className="w-3 h-3 text-sage shrink-0" />
                      {healthStatus?.status === 'ok' ? 'Online' : 'Error'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/5 dark:border-white/10 text-center">
                    <span className="text-[9px] text-ink-muted font-bold uppercase tracking-wider block">Database</span>
                    <span className="text-xs font-bold text-sage flex items-center justify-center gap-1 mt-1">
                      <CheckCircle className="w-3 h-3 text-sage shrink-0" />
                      {healthStatus?.database === 'connected' || healthStatus?.database === 'ok' ? 'Connected' : 'Offline'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/5 dark:border-white/10 text-center">
                    <span className="text-[9px] text-ink-muted font-bold uppercase tracking-wider block">Latency</span>
                    <span className="text-xs font-bold text-ink block mt-1">
                      {healthStatus?.latency !== undefined ? `${healthStatus.latency} ms` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-ink-muted break-all pt-1">
                  API Base URL: <code className="bg-ink/5 dark:bg-white/10 px-2 py-0.5 rounded font-mono text-[10px] text-ink">{API_BASE_URL}</code>
                </div>
              </div>

              {/* Right Column: Platform Runtime Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                    Enterprise Platform Stack
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-sage-light text-sage border border-sage/20 font-bold">
                    v1.1.0 Multi-Tenant Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-ink/5 dark:bg-white/5">
                    <span className="text-ink-muted text-[9px] block">Frontend</span>
                    <strong className="text-ink text-[11px]">Next.js 16</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-ink/5 dark:bg-white/5">
                    <span className="text-ink-muted text-[9px] block">Backend</span>
                    <strong className="text-ink text-[11px]">FastAPI 3.12</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-ink/5 dark:bg-white/5">
                    <span className="text-ink-muted text-[9px] block">Database</span>
                    <strong className="text-ink text-[11px]">PostgreSQL</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-ink/5 dark:bg-white/5">
                    <span className="text-ink-muted text-[9px] block">AI Engine</span>
                    <strong className="text-ink text-[11px]">Multi-Model</strong>
                  </div>
                </div>

                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle className="w-3 h-3 shrink-0" />
                  <span>Row-Level Security & Encrypted Credential Sandboxing</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Danger Zone Modal: Clear All Expenses */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-modal max-w-md w-full p-4 sm:p-6 rounded-2xl border border-coral/30 space-y-4 bg-white dark:bg-[#16201c] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between text-coral">
                <div className="flex items-center gap-2 font-display font-bold text-lg">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Clear All Expenses?</span>
                </div>
                <button type="button" onClick={() => setShowClearModal(false)} className="p-1 text-ink-muted hover:text-ink cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                This action will permanently delete all expense transactions from your database. Categories and budget limits will remain intact.
              </p>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ink">Type &quot;DELETE&quot; to confirm:</label>
                <input
                  type="text"
                  value={clearInputText}
                  onChange={(e) => setClearInputText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full p-2 rounded-xl border text-xs font-mono font-bold uppercase"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="flex-1 py-2 rounded-xl border border-ink/10 text-xs font-bold text-ink hover:bg-ink/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClearExpenses}
                  disabled={clearInputText !== 'DELETE' || isClearingExpenses}
                  className="flex-1 py-2 bg-coral hover:bg-coral-dark disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isClearingExpenses ? 'Deleting...' : 'Confirm Clear'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Danger Zone Modal: Reset Categories */}
      <AnimatePresence>
        {showResetCatModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-modal max-w-md w-full p-4 sm:p-6 rounded-2xl border border-honey/30 space-y-4 bg-white dark:bg-[#16201c] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between text-honey">
                <div className="flex items-center gap-2 font-display font-bold text-lg">
                  <RotateCcw className="w-5 h-5" />
                  <span>Restore Starter Categories?</span>
                </div>
                <button type="button" onClick={() => setShowResetCatModal(false)} className="p-1 text-ink-muted hover:text-ink cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                This will create the default starter categories if any are missing. Existing expenses will not be affected.
              </p>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ink">Type &quot;RESET&quot; to confirm:</label>
                <input
                  type="text"
                  value={resetCatInputText}
                  onChange={(e) => setResetCatInputText(e.target.value)}
                  placeholder="RESET"
                  className="w-full p-2 rounded-xl border text-xs font-mono font-bold uppercase"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetCatModal(false)}
                  className="flex-1 py-2 rounded-xl border border-ink/10 text-xs font-bold text-ink hover:bg-ink/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteResetCategories}
                  disabled={resetCatInputText !== 'RESET' || isResettingCategories}
                  className="flex-1 py-2 bg-honey hover:bg-honey-dark disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isResettingCategories ? 'Restoring...' : 'Confirm Restore'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
