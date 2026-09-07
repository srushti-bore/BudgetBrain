'use client';

import React from 'react';
import {
  LayoutGrid,
  Palette,
  Sliders,
  ShieldCheck,
  Database,
  Activity,
  LucideIcon,
} from 'lucide-react';

export type SettingsTabId = 'all' | 'display' | 'budgets' | 'account' | 'data' | 'system';

export interface TabItem {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
}

export const SETTINGS_TABS: TabItem[] = [
  { id: 'all', label: 'All Sections', icon: LayoutGrid },
  { id: 'display', label: 'Display & Region', icon: Palette },
  { id: 'budgets', label: 'Budget & Alerts', icon: Sliders },
  { id: 'account', label: 'Account & Security', icon: ShieldCheck },
  { id: 'data', label: 'Data & Backup', icon: Database },
  { id: 'system', label: 'System & Health', icon: Activity },
];

export interface SettingsTabsProps {
  activeTab: SettingsTabId;
  onTabChange: (tabId: SettingsTabId) => void;
  className?: string;
}

export default function SettingsTabs({
  activeTab,
  onTabChange,
  className = '',
}: SettingsTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Settings Sections"
      className={`w-full overflow-x-auto no-scrollbar rounded-2xl p-1.5 bg-[#0e1612] dark:bg-[#0a120e] border border-emerald-950/60 dark:border-emerald-950/40 shadow-inner backdrop-blur-md ${className}`}
    >
      <div className="flex items-center gap-1.5 min-w-max sm:min-w-0 sm:grid sm:grid-cols-6">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center gap-2 px-3 sm:px-2.5 md:px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap ${
                isActive
                  ? 'bg-[#15281e] dark:bg-[#12241b] text-emerald-400 dark:text-emerald-300 border border-emerald-500/35 shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-emerald-400 dark:text-emerald-300' : 'text-neutral-400'
                }`}
              />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
