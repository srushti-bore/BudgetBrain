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
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-50 p-5 rounded-2xl glass-modal shadow-2xl border border-sage/35 bg-white/95 dark:bg-[#16201c] flex flex-col gap-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage/15 flex items-center justify-center text-sage border border-sage/20 shrink-0">
                <Brain className="w-6 h-6 text-sage" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-ink dark:text-cream leading-tight">Install BudgetBrain</h4>
                <p className="text-[11px] text-ink-muted mt-0.5">Log expenses and check budgets offline!</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg hover:bg-ink/5 dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 rounded-xl border border-ink/15 dark:border-white/15 text-xs font-semibold text-ink dark:text-cream hover:bg-ink/5 dark:hover:bg-white/10 text-center transition-colors cursor-pointer"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-2 bg-sage hover:bg-sage-dark text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Now</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
