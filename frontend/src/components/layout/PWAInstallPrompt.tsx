'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent default mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the prompt event
      setDeferredPrompt(e);
      // Check if user already dismissed it in this session
      const hasDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!hasDismissed) {
        // Show custom popup after 2 seconds
        setTimeout(() => {
          setIsVisible(true);
        }, 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already running in standalone display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setIsVisible(false);
    // Trigger browser PWA installation dialog
    deferredPrompt.prompt();
    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User install outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss for the current browser session
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          aria-label="Install Application"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 lg:left-72 z-40 max-w-sm w-[calc(100%-2rem)] sm:w-auto p-4 rounded-2xl glass-modal shadow-2xl border border-sage/40 bg-white/95 dark:bg-[#16201c]/95 backdrop-blur-md flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-sage/15 flex items-center justify-center text-sage border border-sage/25 shrink-0">
                <Brain className="w-5 h-5 text-sage" />
              </div>
              <div className="min-w-0">
                <h4 className="font-display font-bold text-xs sm:text-sm text-ink dark:text-cream leading-tight truncate">
                  Install BudgetBrain
                </h4>
                <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                  Fast access & offline budget tracking
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-ink/5 dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss install prompt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-ink/5 dark:border-white/10">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-xl border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink dark:text-cream hover:bg-ink/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-1.5 bg-sage hover:bg-sage-dark text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
