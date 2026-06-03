import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ArticleChatProps {
  article: NewsArticle;
  isDark: boolean;
}

export function ArticleChat({ article, isDark }: ArticleChatProps) {
  const { language } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const articleContent = `${article.title}\n\n${article.content ?? article.description ?? ''}`;

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, articleContent, lang: LANG_CODE[language] }),
      });
      const payload = await response.json();
      const reply =
        typeof payload?.data === 'string'
          ? payload.data
          : payload?.data?.reply ?? payload?.message ?? 'No response received.';
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...nextMessages, { role: 'assistant', content: 'Sorry, the AI assistant is unavailable right now.' }]);
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
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold text-white shadow-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transition-all"
        >
          <Sparkles size={16} />Ask AI
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
              className={`fixed top-16 right-0 z-40 h-[calc(100vh-4rem)] w-full max-w-sm flex flex-col border-l shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-gray-100'}`}
            >
              <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles size={16} className="text-cyan-500 shrink-0" />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Ask AI</p>
                    <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>About: {article.title}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setOpen(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}>
                  <X size={18} />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && !loading && (
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Ask me anything about this article and I'll answer based on its content.
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
                  placeholder="Ask about this article..."
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
