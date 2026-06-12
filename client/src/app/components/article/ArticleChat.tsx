import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eraser, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { getArticleId } from '../../services/newsAPI';
import type { Language } from '../../i18n/translations';
import type { NewsArticle } from '../../types/article';

// Backend proxy keeps GROQ_API_KEY server-side (see CLAUDE.md: POST /api/chat).
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// App language codes → human-language codes the model should answer in.
const LANG_CODE: Record<Language, string> = {
  en: 'en',
  id: 'id',
  zhCN: 'zh-CN',
  zhTW: 'zh-TW',
};

// History caps: persist at most 30 turns per article; replay the last 10 to
// the model (the server trims further to its token budget).
const STORED_TURNS = 30;
const REPLAYED_TURNS = 10;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const loadHistory = (key: string): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-STORED_TURNS) : [];
  } catch {
    return [];
  }
};

interface ArticleChatProps {
  article: NewsArticle;
  isDark: boolean;
}

export function ArticleChat({ article, isDark }: ArticleChatProps) {
  const { t, language } = useApp();
  const storageKey = `chat:${getArticleId(article)}`;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(storageKey));
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Re-hydrate when navigating between articles (component stays mounted).
  useEffect(() => {
    setMessages(loadHistory(storageKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist per-article history, capped so localStorage stays small.
  useEffect(() => {
    try {
      if (messages.length === 0) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(messages.slice(-STORED_TURNS)));
    } catch {
      // Quota/private-mode failures just lose persistence, never the chat.
    }
  }, [messages, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const articleContent = `${article.title}\n\n${article.content ?? article.description ?? ''}`;

  const clearChat = () => setMessages([]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const history = messages.slice(-REPLAYED_TURNS);
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          articleContent,
          lang: LANG_CODE[language],
          ...(history.length > 0 ? { messages: history } : {}),
        }),
      });
      const payload = await response.json();
      const reply =
        typeof payload?.data === 'string'
          ? payload.data
          : payload?.data?.reply ?? payload?.message ?? 'No response received.';
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...nextMessages, { role: 'assistant', content: t.aiUnavailable }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      {/* Floating trigger (hidden while the panel is open) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold text-white shadow-lg bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 transition-all"
        >
          <Sparkles size={16} />{t.askAI}
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile-only dimmer: on small screens the panel covers most of the
                width, so a tap-to-close scrim helps. Desktop stays scrim-free so
                the article keeps scrolling behind the docked panel. */}
            <motion.div
              key="chat-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              key="chat-panel"
              initial={{ x: 360 }}
              animate={{ x: 0 }}
              exit={{ x: 360 }}
              transition={{ type: 'tween', duration: 0.3 }}
              className={`fixed top-0 right-0 z-[60] h-screen w-full max-w-sm flex flex-col border-l shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-gray-100'}`}
            >
              <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles size={16} className="text-cyan-500 shrink-0" />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{t.askAI}</p>
                    <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.chatAbout} {article.title}</p>
                  </div>
                </div>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearChat}
                    aria-label={t.clearChat}
                    title={t.clearChat}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  >
                    <Eraser size={16} />
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}>
                  <X size={18} />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && !loading && (
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t.chatWelcome}
                  </p>
                )}
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-sm'
                          : isDark
                            ? 'bg-slate-800 text-slate-100 rounded-bl-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className={`px-3 py-2 rounded-2xl rounded-bl-sm ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              <div className={`flex items-center gap-2 px-4 py-3 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.chatPlaceholder}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm outline-none ${isDark ? 'bg-slate-800 text-slate-100 placeholder:text-slate-500' : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'}`}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || loading}
                  className="p-2.5 rounded-xl text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
