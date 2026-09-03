'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Bot,
  User as UserIcon,
  Flame,
} from 'lucide-react';
import { aiApi, ChatMessage, dashboardApi } from '@/lib/api';
import { useCurrency, useFormatCurrency } from '@/providers/CurrencyProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';

export default function AskBudgetBrainChat() {
  const { user, isAuthenticated } = useAuth();
  const { currency } = useCurrency();
  const formatCurrency = useFormatCurrency();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I am your **BudgetBrain AI Advisor**. Ask me anything about your spending, affordability, deficit recovery, or savings goals!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([
    'How much did I spend this month?',
    'Can I afford a ₹3,000 purchase?',
    'Where is most of my money going?',
    'How to avoid month-end deficit?',
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch summary to display telemetry bar
  const { data: summary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: dashboardApi.getSummary,
    enabled: Boolean(user && isAuthenticated),
    staleTime: 60 * 1000,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  if (!user || !isAuthenticated) {
    return null;
  }

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
      const res = await aiApi.chat(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        currencySymbol
      );

      if (res && res.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
        if (res.suggested_actions && res.suggested_actions.length > 0) {
          setSuggestedActions(res.suggested_actions);
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered a temporary connection issue. Please try again in a moment!',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          "Chat reset! Ask me anything about your finances, budget caps, or upcoming purchases.",
      },
    ]);
    setSuggestedActions([
      'How much did I spend this month?',
      'Can I afford a ₹3,000 purchase?',
      'Where is most of my money going?',
    ]);
  };

  const renderFormattedContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'my-0.5'}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-semibold text-ink dark:text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </p>
      );
    });
  };

  const remaining = summary?.budget_remaining ?? null;
  const isDeficit = remaining !== null && remaining < 0;

  return (
    <>
      {/* Floating Action Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-700/30 hover:shadow-2xl hover:shadow-emerald-700/40 transition-all cursor-pointer border border-white/20"
            title="Ask BudgetBrain AI"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
            <span>Ask BudgetBrain</span>
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-over / Modal Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh] rounded-2xl shadow-2xl glass-modal border border-emerald-500/25 flex flex-col overflow-hidden bg-white/95 dark:bg-[#121815]/95 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-transparent border-b border-ink/10 dark:border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4 text-amber-200" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-ink dark:text-white flex items-center gap-1.5">
                    Ask BudgetBrain
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                      AI
                    </span>
                  </h3>
                  <p className="text-[10px] text-ink-muted">Personalized financial advisor</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Financial Telemetry Strip */}
            {summary && (
              <div className="px-4 py-2 bg-ink/5 dark:bg-white/5 border-b border-ink/5 dark:border-white/5 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-ink-muted">
                  <span>Spent:</span>
                  <strong className="text-ink dark:text-white">{formatCurrency(summary.total_spent || 0)}</strong>
                </div>
                <div className="flex items-center gap-1">
                  <span>Rem:</span>
                  <strong className={isDeficit ? 'text-coral font-bold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                    {remaining !== null ? formatCurrency(remaining) : 'No limit'}
                  </strong>
                  {isDeficit && <Flame className="w-3 h-3 text-coral inline" />}
                </div>
              </div>
            )}

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      msg.role === 'user'
                        ? 'bg-sage text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {msg.role === 'user' ? <UserIcon className="w-3 h-3" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-sage text-white rounded-tr-xs shadow-xs'
                        : 'bg-white dark:bg-white/10 text-ink dark:text-neutral-200 border border-ink/10 dark:border-white/10 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {renderFormattedContent(msg.content)}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-ink-muted text-xs italic py-1">
                  <Bot className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>Thinking & analyzing your spending...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            {suggestedActions.length > 0 && !isLoading && (
              <div className="px-4 py-2 border-t border-ink/5 dark:border-white/5 bg-ink/[0.02] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {suggestedActions.slice(0, 3).map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium whitespace-nowrap transition-all border border-emerald-500/20 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white dark:bg-white/5 border-t border-ink/10 dark:border-white/10 flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about budget, affordability, expenses..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 rounded-xl bg-ink/5 dark:bg-white/10 border border-ink/10 dark:border-white/15 text-xs text-ink dark:text-white focus:outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
