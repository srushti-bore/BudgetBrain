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
  History,
  MessageSquarePlus,
  Clock,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { aiApi, ChatMessage, dashboardApi } from '@/lib/api';
import { useCurrency, useFormatCurrency } from '@/providers/CurrencyProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  suggestedActions: string[];
}

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    "Hello! I am your **BudgetBrain AI Advisor**. You can chat with me in **any language** (मराठी, हिंदी, English, etc.)! Ask me anything about your spending, affordability, deficit recovery, or savings goals.",
};

const DEFAULT_SUGGESTIONS: string[] = [
  'Can I afford a ₹3,000 purchase?',
  'मी ₹3,000 खर्च करू शकतो का?',
  'Where is most of my money going?',
  'माझे पैसे कुठे जात आहेत?',
];

const getStorageKey = (userId: string) => `budgetbrain_chat_sessions_${userId}`;

export default function AskBudgetBrainChat() {
  const { user, isAuthenticated } = useAuth();
  const { currency } = useCurrency();
  const formatCurrency = useFormatCurrency();

  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>(DEFAULT_SUGGESTIONS);

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

  // Load chat sessions from localStorage on user change
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(getStorageKey(user.id));
      if (raw) {
        const parsed: ChatSession[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          const current = parsed[0];
          setActiveSessionId(current.id);
          setMessages(current.messages || [DEFAULT_WELCOME_MESSAGE]);
          setSuggestedActions(current.suggestedActions || DEFAULT_SUGGESTIONS);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load chat history:', e);
    }

    const initId = 'sess_' + Date.now();
    const initSession: ChatSession = {
      id: initId,
      title: 'New Conversation (नवीन संभाषण)',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [DEFAULT_WELCOME_MESSAGE],
      suggestedActions: DEFAULT_SUGGESTIONS,
    };
    setSessions([initSession]);
    setActiveSessionId(initId);
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setSuggestedActions(DEFAULT_SUGGESTIONS);
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && !showHistory) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, showHistory]);

  // Global event listener to open chat from anywhere
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-budgetbrain-chat', handleOpen);
    return () => window.removeEventListener('open-budgetbrain-chat', handleOpen);
  }, []);

  // Keyboard shortcut to close chat on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!user || !isAuthenticated) {
    return null;
  }

  const persistSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    if (user?.id) {
      try {
        localStorage.setItem(getStorageKey(user.id), JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist chat sessions:', e);
      }
    }
  };

  const handleNewChat = () => {
    const newId = 'sess_' + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation (नवीन संभाषण)',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [DEFAULT_WELCOME_MESSAGE],
      suggestedActions: DEFAULT_SUGGESTIONS,
    };
    const updated = [newSession, ...sessions.filter((s) => s.messages.length > 1)];
    persistSessions(updated);
    setActiveSessionId(newId);
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setSuggestedActions(DEFAULT_SUGGESTIONS);
    setShowHistory(false);
  };

  const handleSelectSession = (sess: ChatSession) => {
    setActiveSessionId(sess.id);
    setMessages(sess.messages || [DEFAULT_WELCOME_MESSAGE]);
    setSuggestedActions(sess.suggestedActions || DEFAULT_SUGGESTIONS);
    setShowHistory(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionId);
    if (updated.length === 0) {
      handleNewChat();
      return;
    }
    persistSessions(updated);
    if (activeSessionId === sessionId) {
      const next = updated[0];
      setActiveSessionId(next.id);
      setMessages(next.messages);
      setSuggestedActions(next.suggestedActions || DEFAULT_SUGGESTIONS);
    }
  };

  const handleClearAllHistory = () => {
    if (user?.id) {
      localStorage.removeItem(getStorageKey(user.id));
    }
    const initId = 'sess_' + Date.now();
    const fresh: ChatSession = {
      id: initId,
      title: 'New Conversation (नवीन संभाषण)',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [DEFAULT_WELCOME_MESSAGE],
      suggestedActions: DEFAULT_SUGGESTIONS,
    };
    persistSessions([fresh]);
    setActiveSessionId(initId);
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setSuggestedActions(DEFAULT_SUGGESTIONS);
    setShowHistory(false);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: query };
    const newMessages: ChatMessage[] = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Auto-generate title if this is the first user message in this session
    let sessionTitle = query.slice(0, 38);
    if (query.length > 38) sessionTitle += '...';

    const updatedWithUser = sessions.map((s) => {
      if (s.id === activeSessionId) {
        const isFirst = s.messages.filter((m) => m.role === 'user').length === 0;
        return {
          ...s,
          title: isFirst ? sessionTitle : s.title,
          updatedAt: Date.now(),
          messages: newMessages,
        };
      }
      return s;
    });
    persistSessions(updatedWithUser);

    try {
      const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
      const res = await aiApi.chat(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        currencySymbol
      );

      if (res && res.reply) {
        const assistantMsg: ChatMessage = { role: 'assistant', content: res.reply };
        const finalMessages = [...newMessages, assistantMsg];
        setMessages(finalMessages);
        const newActions = res.suggested_actions && res.suggested_actions.length > 0 ? res.suggested_actions : suggestedActions;
        if (res.suggested_actions && res.suggested_actions.length > 0) {
          setSuggestedActions(res.suggested_actions);
        }

        const updatedWithAssistant = sessions.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              updatedAt: Date.now(),
              messages: finalMessages,
              suggestedActions: newActions,
            };
          }
          return s;
        });
        persistSessions(updatedWithAssistant);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered a temporary connection issue. Please try again in a moment! / तात्पुरती तांत्रिक अडचण आली आहे, कृपया पुन्हा प्रयत्न करा.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setSuggestedActions(DEFAULT_SUGGESTIONS);
    const updated = sessions.map((s) => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: 'New Conversation (नवीन संभाषण)',
          updatedAt: Date.now(),
          messages: [DEFAULT_WELCOME_MESSAGE],
          suggestedActions: DEFAULT_SUGGESTIONS,
        };
      }
      return s;
    });
    persistSessions(updated);
  };

  const formatSessionTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Today, ${timeStr}`;
    }
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
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
      {!isOpen && (
        <button
          key="ask-budgetbrain-floating-trigger"
          id="ask-budgetbrain-btn"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-700/40 hover:shadow-2xl hover:shadow-emerald-700/60 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20 select-none group"
          title="Ask BudgetBrain AI Financial Advisor"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-amber-300 pointer-events-none group-hover:rotate-12 transition-transform" />
          <span className="pointer-events-none">Ask BudgetBrain</span>
          <span className="relative flex h-2 w-2 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
        </button>
      )}

      {/* Slide-over / Modal Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ask-budgetbrain-chat-window"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[70] w-[95vw] sm:w-[430px] h-[590px] max-h-[85vh] rounded-2xl shadow-2xl glass-modal border border-emerald-500/25 flex flex-col overflow-hidden bg-white/95 dark:bg-[#121815]/95 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-transparent border-b border-ink/10 dark:border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {showHistory ? (
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="p-1.5 -ml-1 rounded-lg text-ink hover:text-emerald-600 hover:bg-ink/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    title="Back to conversation"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-sm text-ink dark:text-white flex items-center gap-1.5 truncate">
                    {showHistory ? 'Chat History' : 'Ask BudgetBrain'}
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      AI
                    </span>
                  </h3>
                  <p className="text-[10px] text-ink-muted truncate">
                    {showHistory
                      ? `${sessions.length} past conversations saved`
                      : 'Multilingual financial advisor (मराठी, हिंदी, English)'}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-1">
                {/* New Chat Button */}
                <button
                  type="button"
                  onClick={handleNewChat}
                  title="Start New Chat (नवीन संभाषण)"
                  className="p-1.5 rounded-lg text-ink-muted hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                </button>

                {/* Chat History Icon Button */}
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  title={showHistory ? 'Back to Chat (चॅटकडे परत जा)' : 'View Chat History (मागील संभाषणे)'}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    showHistory
                      ? 'text-emerald-600 bg-emerald-500/20 dark:bg-emerald-500/25'
                      : 'text-ink-muted hover:text-ink hover:bg-ink/5 dark:hover:bg-white/5'
                  }`}
                >
                  <History className="w-4 h-4" />
                </button>

                {/* Clear Conversation */}
                {!showHistory && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    title="Clear current chat"
                    className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Close Button */}
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
            {summary && !showHistory && (
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

            {/* Content Area: Chat History View OR Active Conversation */}
            {showHistory ? (
              /* --- CHAT HISTORY VIEW --- */
              <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-ink/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="font-bold text-xs text-ink dark:text-white">
                        Past Conversations (मागील संभाषणे)
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      + New Chat
                    </button>
                  </div>

                  {sessions.length === 0 || (sessions.length === 1 && sessions[0].messages.length <= 1) ? (
                    <div className="py-14 text-center text-ink-muted space-y-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                        <History className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-ink dark:text-white">No past conversations yet</p>
                      <p className="text-[11px] max-w-[240px] mx-auto text-ink-muted">
                        Ask any questions in Marathi, Hindi, or English to start building your chat history.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowHistory(false)}
                        className="mt-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
                      >
                        Start Chatting
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((sess) => {
                        const isCurrent = sess.id === activeSessionId;
                        const lastMsg = sess.messages[sess.messages.length - 1]?.content || '';
                        const cleanSnippet = lastMsg.replace(/[*_#]/g, '').slice(0, 65);

                        return (
                          <div
                            key={sess.id}
                            onClick={() => handleSelectSession(sess)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-start justify-between gap-2.5 ${
                              isCurrent
                                ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/15 shadow-xs'
                                : 'bg-ink/[0.02] dark:bg-white/[0.03] border-ink/5 dark:border-white/5 hover:border-emerald-500/25 hover:bg-ink/[0.04]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-bold text-xs text-ink dark:text-white truncate">
                                  {sess.title || 'Conversation'}
                                </h5>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold shrink-0">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-ink-muted truncate mt-0.5">
                                {cleanSnippet || 'No messages'}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-ink-muted/80">
                                <span>{formatSessionTime(sess.updatedAt || sess.createdAt)}</span>
                                <span>•</span>
                                <span>{sess.messages.length} messages</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSession(sess.id, e)}
                                title="Delete this chat"
                                className="p-1 text-ink-muted hover:text-coral hover:bg-coral/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-emerald-600 transition-colors" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {sessions.length > 1 && (
                  <div className="pt-3 border-t border-ink/5 dark:border-white/5 mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleClearAllHistory}
                      className="text-[11px] text-coral hover:underline font-semibold cursor-pointer"
                    >
                      Clear All History (सर्व संभाषणे हटवा)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHistory(false)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer"
                    >
                      Back to Chat
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* --- ACTIVE CONVERSATION VIEW --- */
              <>
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
                    placeholder="Ask in any language (मराठी, हिंदी, English)..."
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
