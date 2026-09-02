'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/providers/ThemeProvider';
import { useCurrency } from '@/providers/CurrencyProvider';
import { useSettings, DateFormatOption, FirstDayOption } from '@/providers/SettingsProvider';
import { useTranslation } from '@/providers/LanguageProvider';
import { LanguageCode } from '@/lib/translations';
import { categoryApi, expenseApi, budgetApi, API_BASE_URL } from '@/lib/api';
import { exportExpensesToCSV, exportFullBackupJSON, validateBackupJSON } from '@/lib/exportUtils';
import { useAuth } from '@/providers/AuthProvider';
import {
  Settings,
  Palette,
  Sliders,
  Database,
  Info,
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
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
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

  const [activeTab, setActiveTab] = useState<'general' | 'budgets' | 'account' | 'data' | 'about'>('general');
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
    <div className="space-y-7 max-w-5xl mx-auto pb-24">
      {/* Toast Notification (Center Top) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold border backdrop-blur-md transition-all ${
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
          <p className="text-xs md:text-sm text-ink-muted mt-1.5 font-medium">
            Customize display formats, alert thresholds, export transactions, and manage backups.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-ink/5 dark:bg-white/5 border border-ink/5 dark:border-white/10">
        {[
          { id: 'general', label: 'Display & Regional', icon: Palette },
          { id: 'budgets', label: 'Budget & Alerts', icon: Sliders },
          { id: 'account', label: 'Account & Security', icon: ShieldCheck },
          { id: 'data', label: 'Data & Backup', icon: Database },
          { id: 'about', label: 'System & Health', icon: Info },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-[#17211d] text-sage shadow-sm border border-sage/20'
                  : 'text-ink-muted hover:text-ink dark:hover:text-cream hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sage' : 'text-ink-muted'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>


      {/* Tab 1: Display & Regional Preferences */}
      {activeTab === 'general' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Appearance Card */}
          <div className="glass-card p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Palette className="w-4 h-4 text-sage" />
                <span>Visual Theme Mode</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">Toggle between soft light and soothing dark palettes</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-sage bg-sage-light/60 dark:bg-sage/10 text-sage font-bold shadow-xs'
                    : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-honey/15 flex items-center justify-center text-honey">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm block font-bold">Light Mineral Theme</span>
                    <span className="text-[11px] text-ink-muted font-normal">Warm cream & mineral sage</span>
                  </div>
                </div>
                {theme === 'light' && <CheckCircle className="w-4 h-4 text-sage" />}
              </button>

              <button
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-sage bg-sage-light/60 dark:bg-sage/10 text-sage font-bold shadow-xs'
                    : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky/15 flex items-center justify-center text-sky">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm block font-bold">Dark Slate Theme</span>
                    <span className="text-[11px] text-ink-muted font-normal">Deep forest & slate green</span>
                  </div>
                </div>
                {theme === 'dark' && <CheckCircle className="w-4 h-4 text-sage" />}
              </button>
            </div>
          </div>

          {/* Language Selection Card */}
          <div className="glass-card p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Globe className="w-4 h-4 text-sage" />
                <span>{t('language_selection', 'Language / भाषा')}</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                {t('language_help', 'Choose your preferred interface language across BudgetBrain.')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {languages.map((opt) => {
                const isSelected = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    onClick={() => {
                      setLanguage(opt.code);
                      showToast(`Language switched to ${opt.nativeName} (${opt.name})`);
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sage bg-sage-light/60 dark:bg-sage/15 text-sage font-bold shadow-xs'
                        : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{opt.flag}</span>
                      <div className="text-left min-w-0">
                        <span className="text-xs sm:text-sm font-bold block truncate text-ink dark:text-cream">
                          {opt.nativeName}
                        </span>
                        <span className="text-[10px] text-ink-muted block truncate">{opt.name}</span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-sage shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Regional Currency & Date Formats Card */}
          <div className="glass-card p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sage" />
                <span>Regional & Date Preferences</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">Configure base active currency and global date formats</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Currency Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink uppercase tracking-wider block">
                  Active Display Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border text-sm font-semibold cursor-pointer"
                >
                  <option value="INR">INR (₹) — Indian Rupee (Default Base)</option>
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                </select>
                <span className="text-[11px] text-ink-muted block">
                  Live exchange rates fetched dynamically from Open ER-API.
                </span>
              </div>

              {/* Date Format Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink uppercase tracking-wider block">
                  Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as DateFormatOption)}
                  className="w-full p-2.5 rounded-xl border text-sm font-semibold cursor-pointer"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY — e.g. 29 Aug 2026</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY — e.g. Aug 29, 2026</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD — e.g. 2026-08-29 (ISO)</option>
                </select>
                <span className="text-[11px] text-ink-muted block">
                  Preview: <strong className="text-ink">{formatCustomDate(new Date().toISOString())}</strong>
                </span>
              </div>

              {/* First Day of Week */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink uppercase tracking-wider block">
                  First Day of Week
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFirstDayOfWeek('monday')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      firstDayOfWeek === 'monday'
                        ? 'bg-sage-light text-sage border-sage/40 dark:bg-sage/15'
                        : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                    }`}
                  >
                    Monday
                  </button>
                  <button
                    onClick={() => setFirstDayOfWeek('sunday')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      firstDayOfWeek === 'sunday'
                        ? 'bg-sage-light text-sage border-sage/40 dark:bg-sage/15'
                        : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink'
                    }`}
                  >
                    Sunday
                  </button>
                </div>
                <span className="text-[11px] text-ink-muted block">
                  Used for weekly spending aggregation and trend windows.
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 2: Budget & Alert Rules */}
      {activeTab === 'budgets' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="glass-card p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sage" />
                <span>Budget Status & Alert Thresholds</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">Control when budget warnings and color indicators trigger</p>
            </div>

            {/* Custom Editable Threshold Control */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label htmlFor="custom-threshold-input" className="text-xs font-bold text-ink uppercase tracking-wider block">
                    Near Limit Alert Threshold
                  </label>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Set the exact custom percentage when warning badges and alerts trigger
                  </p>
                </div>

                {/* Direct Number Input & Percentage Display */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="relative flex items-center">
                    <input
                      id="custom-threshold-input"
                      type="number"
                      min={1}
                      max={99}
                      value={nearLimitThreshold}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          const clamped = Math.max(1, Math.min(99, val));
                          setNearLimitThreshold(clamped);
                        }
                      }}
                      className="w-20 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border-2 border-honey/50 text-right font-display font-extrabold text-base text-ink focus:outline-none focus:border-honey transition-all"
                    />
                    <span className="ml-1.5 font-bold text-sm text-honey">%</span>
                  </div>
                </div>
              </div>

              {/* Smooth Range Slider */}
              <div className="space-y-1.5 pt-2">
                <input
                  type="range"
                  min={1}
                  max={99}
                  step={1}
                  value={nearLimitThreshold}
                  onChange={(e) => setNearLimitThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-ink/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-honey"
                />
                <div className="flex justify-between text-[10px] text-ink-muted font-bold">
                  <span>1% (Early Warning)</span>
                  <span className="text-honey font-bold">Custom Active: {nearLimitThreshold}%</span>
                  <span>99% (Late Warning)</span>
                </div>
              </div>

              {/* Quick Preset Options */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-2">
                  Quick Presets:
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {[50, 65, 75, 80, 90].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNearLimitThreshold(val)}
                      className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                        nearLimitThreshold === val
                          ? 'bg-honey-light text-honey border-honey/50 dark:bg-honey/20 font-bold shadow-xs'
                          : 'border-ink/10 dark:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5 text-ink font-semibold'
                      }`}
                    >
                      <span className="text-sm block font-display">{val}%</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3.5 rounded-xl bg-honey-light/40 dark:bg-honey/10 border border-honey/30 space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-honey shrink-0" />
                  <span className="text-xs font-bold text-ink">
                    Live Warning Trigger Preview:
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  When your monthly or daily spending reaches <strong className="text-ink font-bold">{nearLimitThreshold}%</strong>, BudgetBrain will display the <span className="inline-flex items-center gap-1 font-bold text-honey bg-honey-light dark:bg-honey/20 px-2 py-0.5 rounded border border-honey/30 text-[10px]">⚠️ Near Limit (≥{nearLimitThreshold}%)</span> badge and show real-time popup alerts during expense logging.
                </p>
              </div>
            </div>

            <hr className="border-ink/5 dark:border-white/10" />

            {/* Predictive Insights Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-ink block flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-honey" />
                  Predictive Health Widget on Dashboard
                </span>
                <span className="text-xs text-ink-muted">
                  Show the monthly spend extrapolation and financial health score widget.
                </span>
              </div>
              <button
                onClick={() => setShowPredictiveInsights(!showPredictiveInsights)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showPredictiveInsights ? 'bg-sage' : 'bg-ink/20 dark:bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    showPredictiveInsights ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: Account & Security */}
      {activeTab === 'account' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Profile Overview Card */}
          <div className="glass-card p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-sage" />
                <span>Account Profile</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">Your personal credentials and multi-tenant security status</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-ink/10 dark:border-white/10 bg-white/60 dark:bg-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Email Address</span>
                  {user?.is_verified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Verified ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                      Unverified
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-ink font-mono">{user?.email || 'N/A'}</p>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{user?.is_verified ? 'Verified Tenant Identity' : 'Pending Email Verification'}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-ink/10 dark:border-white/10 bg-white/60 dark:bg-white/5 space-y-1">
                <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Full Name</span>
                <p className="text-sm font-semibold text-ink">{user?.full_name || 'Not Specified'}</p>
                <p className="text-[11px] text-ink-muted pt-1">Single-tenant isolated sandbox</p>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="glass-card p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-sage" />
                <span>Change Password</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">Update your account password using secure BCrypt encryption</p>
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
              className="space-y-4 max-w-lg"
            >
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                  Current Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-ink-muted" />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-ink/10 dark:border-white/10 text-sm bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-sage/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 text-ink-muted hover:text-ink dark:hover:text-cream focus:outline-none p-1 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-ink-muted" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-ink/10 dark:border-white/10 text-sm bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-sage/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 text-ink-muted hover:text-ink dark:hover:text-cream focus:outline-none p-1 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Validation Badges */}
                {newPassword.length > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-ink/5 dark:bg-white/5 border border-ink/10 dark:border-white/10 text-[11px] grid grid-cols-2 gap-1.5">
                    <span className={`flex items-center gap-1 ${newPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-muted'}`}>
                      {newPassword.length >= 8 ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-coral" />} 8+ Characters
                    </span>
                    <span className={`flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-muted'}`}>
                      {/[A-Z]/.test(newPassword) ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-coral" />} 1 Uppercase (A-Z)
                    </span>
                    <span className={`flex items-center gap-1 ${/[a-z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-muted'}`}>
                      {/[a-z]/.test(newPassword) ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-coral" />} 1 Lowercase (a-z)
                    </span>
                    <span className={`flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-muted'}`}>
                      {/[0-9]/.test(newPassword) ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-coral" />} 1 Number (0-9)
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-ink-muted" />
                  <input
                    type={showConfirmNewPass ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-ink/10 dark:border-white/10 text-sm bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-sage/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPass(!showConfirmNewPass)}
                    className="absolute right-3 text-ink-muted hover:text-ink dark:hover:text-cream focus:outline-none p-1 cursor-pointer"
                  >
                    {showConfirmNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
                  <p className="text-[11px] text-coral mt-1 flex items-center gap-1">
                    <X className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  isUpdatingPassword ||
                  !currentPassword ||
                  newPassword.length < 8 ||
                  newPassword !== confirmNewPassword
                }
                className="px-5 py-2.5 rounded-xl bg-sage hover:bg-sage-dark text-white font-bold text-xs sm:text-sm disabled:opacity-50 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>


          {/* Session Management & Multi-Device Logout Card */}
          <div className="glass-card p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sage" />
                <span>Session Management & Security</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">Control active Refresh Tokens and multi-device access</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => logout()}
                className="px-4 py-2.5 rounded-xl border border-ink/10 dark:border-white/10 text-xs font-bold text-ink hover:bg-ink/5 dark:hover:bg-white/5 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-ink-muted" />
                <span>Sign Out from this Device</span>
              </button>

              <button
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
                className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{isLoggingOutAll ? 'Logging Out All...' : 'Sign Out from All Devices'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 3: Data Management & Backup */}
      {activeTab === 'data' && (

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Export & Backup Card */}
          <div className="glass-card p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Database className="w-4 h-4 text-sage" />
                <span>Export & Full Backup</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">Download your financial records or create full database backups</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CSV Export */}
              <div className="p-4 rounded-xl border border-ink/10 dark:border-white/10 bg-white/60 dark:bg-white/5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sage-light dark:bg-sage/15 flex items-center justify-center text-sage">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-ink">Export Expenses (CSV)</h4>
                    <span className="text-[11px] text-ink-muted block">For Excel, Sheets, or Numbers</span>
                  </div>
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={isExportingCSV}
                  className="w-full py-2 bg-sage hover:bg-sage-dark disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingCSV ? 'Generating CSV...' : 'Download CSV'}</span>
                </button>
              </div>

              {/* JSON Backup */}
              <div className="p-4 rounded-xl border border-ink/10 dark:border-white/10 bg-white/60 dark:bg-white/5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-light dark:bg-sky/15 flex items-center justify-center text-sky">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-ink">Full Snapshot (JSON)</h4>
                    <span className="text-[11px] text-ink-muted block">Categories, expenses & budgets</span>
                  </div>
                </div>
                <button
                  onClick={handleExportJSON}
                  disabled={isExportingJSON}
                  className="w-full py-2 bg-sky hover:bg-sky/80 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingJSON ? 'Creating Snapshot...' : 'Backup to JSON'}</span>
                </button>
              </div>
            </div>

            {/* Restore from JSON */}
            <div className="p-4 rounded-xl border border-dashed border-ink/15 dark:border-white/15 bg-ink/2 dark:bg-white/2 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-ink flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-sage" />
                    <span>Verify / Inspect Backup JSON</span>
                  </h4>
                  <span className="text-[11px] text-ink-muted block">
                    Upload a previously exported BudgetBrain backup file to test validity.
                  </span>
                </div>
                <label className="px-3 py-1.5 bg-ink/5 dark:bg-white/10 hover:bg-ink/10 text-ink font-semibold text-xs rounded-lg cursor-pointer transition-colors">
                  <span>Select File</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card p-6 sm:p-7 border-coral/30 space-y-4">
            <div className="flex items-center gap-2 text-coral">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-display font-bold text-base">Danger Zone</h3>
            </div>
            <p className="text-xs text-ink-muted">
              Irreversible maintenance operations. Please proceed with caution.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => setShowClearModal(true)}
                className="p-3 rounded-xl border border-coral/30 bg-coral-light/20 dark:bg-coral/10 text-coral font-bold text-xs flex items-center justify-center gap-2 hover:bg-coral hover:text-white transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Expenses</span>
              </button>

              <button
                onClick={() => setShowResetCatModal(true)}
                className="p-3 rounded-xl border border-honey/30 bg-honey-light/20 dark:bg-honey/10 text-honey font-bold text-xs flex items-center justify-center gap-2 hover:bg-honey hover:text-white transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore Starter Categories</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 4: System & Health Status */}
      {activeTab === 'about' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Live Health Status Card */}
          <div className="glass-card p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sage" />
                  <span>Live System Connectivity</span>
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">Real-time status check with FastAPI backend & database</p>
              </div>
              <button
                onClick={checkHealth}
                disabled={isCheckingHealth}
                className="px-3 py-1.5 rounded-lg bg-ink/5 dark:bg-white/10 hover:bg-ink/10 text-xs font-bold text-ink transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>{isCheckingHealth ? 'Pinging...' : 'Re-Check'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/5 dark:border-white/10">
                <span className="text-[10px] text-ink-muted font-bold uppercase tracking-wider block">FastAPI Server</span>
                <span className="text-sm font-bold text-sage flex items-center gap-1.5 mt-1">
                  <CheckCircle className="w-4 h-4 text-sage" />
                  {healthStatus?.status === 'ok' ? 'Operational' : 'Error'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/5 dark:border-white/10">
                <span className="text-[10px] text-ink-muted font-bold uppercase tracking-wider block">PostgreSQL (Supabase)</span>
                <span className="text-sm font-bold text-sage flex items-center gap-1.5 mt-1">
                  <CheckCircle className="w-4 h-4 text-sage" />
                  {healthStatus?.database === 'ok' ? 'Connected' : 'Offline'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/70 dark:bg-white/5 border border-ink/5 dark:border-white/10">
                <span className="text-[10px] text-ink-muted font-bold uppercase tracking-wider block">API Latency</span>
                <span className="text-sm font-bold text-ink block mt-1">
                  {healthStatus?.latency ? `${healthStatus.latency} ms` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-ink-muted">
              Backend URL: <code className="bg-ink/5 dark:bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">{API_BASE_URL}</code>
            </div>
          </div>

          {/* App Info Card */}
          <div className="glass-card p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-ink">BudgetBrain Application</h3>
                <span className="text-xs text-ink-muted">Version 1.1.0 (Production Release)</span>
              </div>
              <span className="px-3 py-1 rounded-xl bg-sage-light text-sage border border-sage/25 text-xs font-bold">
                Private & Auth-Free
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-ink/5 dark:bg-white/5">
                <span className="text-ink-muted text-[10px] block">Frontend</span>
                <strong className="text-ink">Next.js 16 + React 19</strong>
              </div>
              <div className="p-2 rounded-lg bg-ink/5 dark:bg-white/5">
                <span className="text-ink-muted text-[10px] block">Backend</span>
                <strong className="text-ink">FastAPI Python 3.12</strong>
              </div>
              <div className="p-2 rounded-lg bg-ink/5 dark:bg-white/5">
                <span className="text-ink-muted text-[10px] block">Database</span>
                <strong className="text-ink">PostgreSQL (Supabase)</strong>
              </div>
              <div className="p-2 rounded-lg bg-ink/5 dark:bg-white/5">
                <span className="text-ink-muted text-[10px] block">Deployment</span>
                <strong className="text-ink">Vercel + Render</strong>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Danger Zone Modal: Clear All Expenses */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-modal max-w-md w-full p-6 rounded-2xl border border-coral/30 space-y-4 bg-white dark:bg-[#16201c]"
            >
              <div className="flex items-center justify-between text-coral">
                <div className="flex items-center gap-2 font-display font-bold text-lg">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Clear All Expenses?</span>
                </div>
                <button onClick={() => setShowClearModal(false)} className="p-1 text-ink-muted hover:text-ink">
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
                  onClick={() => setShowClearModal(false)}
                  className="flex-1 py-2 rounded-xl border border-ink/10 text-xs font-bold text-ink hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteClearExpenses}
                  disabled={clearInputText !== 'DELETE' || isClearingExpenses}
                  className="flex-1 py-2 bg-coral hover:bg-coral-dark disabled:opacity-40 text-white text-xs font-bold rounded-xl"
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
              className="glass-modal max-w-md w-full p-6 rounded-2xl border border-honey/30 space-y-4 bg-white dark:bg-[#16201c]"
            >
              <div className="flex items-center justify-between text-honey">
                <div className="flex items-center gap-2 font-display font-bold text-lg">
                  <RotateCcw className="w-5 h-5" />
                  <span>Restore Starter Categories?</span>
                </div>
                <button onClick={() => setShowResetCatModal(false)} className="p-1 text-ink-muted hover:text-ink">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                This will create the 9 default starter categories (Food, Travel, Rent, Utilities, Entertainment, etc.) if any are missing. Existing expenses will not be affected.
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
                  onClick={() => setShowResetCatModal(false)}
                  className="flex-1 py-2 rounded-xl border border-ink/10 text-xs font-bold text-ink hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteResetCategories}
                  disabled={resetCatInputText !== 'RESET' || isResettingCategories}
                  className="flex-1 py-2 bg-honey hover:bg-honey-dark disabled:opacity-40 text-white text-xs font-bold rounded-xl"
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
