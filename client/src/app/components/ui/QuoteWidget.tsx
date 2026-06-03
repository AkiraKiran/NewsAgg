import { Quote as QuoteIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { useQuote } from '../../hooks/useQuote';

// Editorial accent-left card (CLAUDE.md: border-l-4 border-accent, italic
// quote, author with dash). Rotates every 7s with a soft fade; shares the
// sentiment panels' surface so it sits flush at the bottom of the sidebar.
const surfaceClass = (isDark: boolean): string =>
  isDark ? 'bg-slate-800/80 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md';

export function QuoteWidget() {
  const { isDark, t } = useApp();
  const { quote, index, isLoading } = useQuote();

  if (isLoading) {
    return (
      <div className={`rounded-2xl border-l-4 border-indigo-500 shadow-lg p-5 ${surfaceClass(isDark)}`}>
        <div className="animate-pulse space-y-2">
          <div className={`h-3 w-24 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          <div className={`h-4 w-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          <div className={`h-4 w-2/3 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
      </div>
    );
  }

  // No quote available → render nothing rather than an empty card.
  if (!quote) return null;

  return (
    <div className={`rounded-2xl border-l-4 border-indigo-500 shadow-lg p-5 ${surfaceClass(isDark)}`}>
      <div className="flex items-center gap-1.5 mb-3">
        <QuoteIcon size={13} className="text-indigo-500" />
        <p className={`text-[11px] font-mono uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {t.quoteOfDay}
        </p>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <p className={`font-poppins text-base italic leading-relaxed ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
            “{quote.quote}”
          </p>
          <p className={`mt-3 text-sm font-semibold text-right ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            — {quote.author}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
