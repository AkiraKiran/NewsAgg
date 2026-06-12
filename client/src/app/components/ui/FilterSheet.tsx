import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, LayoutGrid, Newspaper, Gauge } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CATEGORIES, CATEGORY_LABELS, SOURCES, sourceLogoUrl } from '../../constants';
import { ImageWithFallback } from '../utils/ImageWithFallback';
import type { SentimentType } from '../../types/sentiment';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
}

type FilterTab = 'category' | 'source' | 'sentiment';

const SENTIMENT_OPTIONS: SentimentType[] = ['positive', 'neutral', 'negative'];

// Desktop renders an anchored dropdown, mobile a bottom sheet. The breakpoint
// mirrors Tailwind's `md` so it stays in sync with the rest of the layout.
function useIsDesktop(): boolean {
  const query = '(min-width: 768px)';
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export function FilterSheet({ open, onClose }: FilterSheetProps) {
  const {
    t,
    isDark,
    selectedCategory,
    setSelectedCategory,
    selectedSources,
    setSelectedSources,
    selectedSentiment,
    setSelectedSentiment,
  } = useApp();
  const [tab, setTab] = useState<FilterTab>('category');
  const isDesktop = useIsDesktop();

  const toggleSource = (id: string) => {
    setSelectedSources(
      selectedSources.includes(id)
        ? selectedSources.filter((s) => s !== id)
        : [...selectedSources, id]
    );
  };

  const clearAll = () => {
    setSelectedCategory('all');
    setSelectedSources([]);
    setSelectedSentiment('all');
  };

  const activeCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    selectedSources.length +
    (selectedSentiment !== 'all' ? 1 : 0);

  const sentimentLabel: Record<SentimentType, string> = {
    positive: t.positive,
    neutral: t.neutral,
    negative: t.negative,
  };

  // Shared panel body — only one variant (dropdown or sheet) mounts at a time.
  const body = (
    <div className="flex flex-col">
      {/* Header row */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? 'border-slate-700' : 'border-gray-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`font-poppins text-sm font-semibold ${
              isDark ? 'text-slate-100' : 'text-gray-900'
            }`}
          >
            {t.filters}
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-cyan-500 text-white text-[11px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {t.clearFilters}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close filters"
            className={`p-1.5 rounded-md transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
        {(
          [
            { key: 'category', label: t.byCategory, icon: LayoutGrid },
            { key: 'source', label: t.bySource, icon: Newspaper },
            { key: 'sentiment', label: t.bySentiment, icon: Gauge },
          ] as const
        ).map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-cyan-500 text-white'
                  : isDark
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-3 max-h-[55vh] overflow-y-auto">
        {tab === 'category' ? (
          <div className="flex flex-wrap gap-2">
            <CategoryChip
              label={t.allCategories}
              active={selectedCategory === 'all'}
              isDark={isDark}
              onClick={() => setSelectedCategory('all')}
            />
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={CATEGORY_LABELS[cat]}
                active={selectedCategory === cat}
                isDark={isDark}
                onClick={() => setSelectedCategory(cat)}
              />
            ))}
          </div>
        ) : tab === 'sentiment' ? (
          <div className="flex flex-wrap gap-2">
            <CategoryChip
              label={t.allSentiment}
              active={selectedSentiment === 'all'}
              isDark={isDark}
              onClick={() => setSelectedSentiment('all')}
            />
            {SENTIMENT_OPTIONS.map((s) => (
              <CategoryChip
                key={s}
                label={sentimentLabel[s]}
                active={selectedSentiment === s}
                isDark={isDark}
                tone={s}
                onClick={() => setSelectedSentiment(s)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* "All Sources" resets the multi-select (empty = no source filter) */}
            <SourceRow
              name={t.allSources}
              selected={selectedSources.length === 0}
              isDark={isDark}
              onClick={() => setSelectedSources([])}
            />
            {SOURCES.map((s) => (
              <SourceRow
                key={s.id}
                name={s.name}
                logo={sourceLogoUrl(s.domain)}
                selected={selectedSources.includes(s.id)}
                isDark={isDark}
                onClick={() => toggleSource(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {open &&
        (isDesktop ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-xl overflow-hidden z-50 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'
            }`}
          >
            {body}
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t shadow-2xl ${
                isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'
              }`}
            >
              {/* Grab handle */}
              <div className="flex justify-center pt-2.5 pb-1">
                <span
                  className={`h-1.5 w-10 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`}
                />
              </div>
              {body}
            </motion.div>
          </>
        ))}
    </AnimatePresence>
  );
}

interface CategoryChipProps {
  label: string;
  active: boolean;
  isDark: boolean;
  onClick: () => void;
  // Optional semantic tone for sentiment chips; defaults to the indigo accent.
  tone?: SentimentType;
}

const TONE_ACTIVE_CLASS: Record<SentimentType, string> = {
  positive: 'bg-emerald-500 text-white',
  neutral: 'bg-amber-500 text-white',
  negative: 'bg-rose-500 text-white',
};

function CategoryChip({ label, active, isDark, onClick, tone }: CategoryChipProps) {
  const activeClass = tone ? TONE_ACTIVE_CLASS[tone] : 'bg-cyan-500 text-white';
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? activeClass
          : isDark
          ? 'bg-slate-700/60 text-slate-200 hover:bg-slate-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

interface SourceRowProps {
  name: string;
  logo?: string;
  selected: boolean;
  isDark: boolean;
  onClick: () => void;
}

function SourceRow({ name, logo, selected, isDark, onClick }: SourceRowProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors ${
        selected
          ? 'bg-cyan-500/10 ring-1 ring-cyan-500/40'
          : isDark
          ? 'hover:bg-slate-700/60'
          : 'hover:bg-gray-100'
      }`}
    >
      {logo ? (
        <ImageWithFallback
          src={logo}
          alt={name}
          className={`w-7 h-7 rounded-md object-contain flex-shrink-0 ${
            isDark ? 'bg-slate-700' : 'bg-gray-100'
          }`}
        />
      ) : (
        <span
          className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
            isDark ? 'bg-slate-700' : 'bg-gray-100'
          }`}
        >
          <Newspaper size={14} className={isDark ? 'text-slate-300' : 'text-gray-500'} />
        </span>
      )}
      <span className={`flex-1 text-sm font-medium ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
        {name}
      </span>
      <span
        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
          selected
            ? 'bg-cyan-500 border-cyan-500 text-white'
            : isDark
            ? 'border-slate-600'
            : 'border-gray-300'
        }`}
      >
        {selected && <Check size={13} />}
      </span>
    </button>
  );
}
