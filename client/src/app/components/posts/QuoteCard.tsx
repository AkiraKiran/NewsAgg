import { Quote as QuoteIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { DailyQuote } from '../../types/api';

interface QuoteCardProps {
  quote: DailyQuote;
  pinned?: boolean;
}

/** One FavQs quote rendered as a feed card. `pinned` marks the quote of the
 * day at the top of the Pulse rail. */
export function QuoteCard({ quote, pinned = false }: QuoteCardProps) {
  const { isDark, t } = useApp();

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
      } ${pinned ? 'border-l-4 border-l-[var(--brand,#06b6d4)]' : ''}`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <QuoteIcon size={12} className="text-[var(--brand,#06b6d4)]" />
        <span className={`text-[10px] font-mono uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {pinned ? t.quoteOfDay : 'FavQs'}
        </span>
      </div>
      <p className={`text-sm italic leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
        “{quote.quote}”
      </p>
      <p className={`mt-2 text-xs font-semibold text-right ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
        — {quote.author}
      </p>
    </div>
  );
}
