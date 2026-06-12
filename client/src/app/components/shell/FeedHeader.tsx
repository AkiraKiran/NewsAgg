import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CATEGORIES, CATEGORY_BADGE_CLASS, CATEGORY_LABELS, type Category } from '../../constants';
import { FilterSheet } from '../ui/FilterSheet';

/** Sticky header of the centre column: horizontally scrollable category chips
 * plus the full filter trigger (source/sentiment live in the FilterSheet). */
export function FeedHeader() {
  const {
    t,
    isDark,
    selectedCategory,
    setSelectedCategory,
    selectedSources,
    selectedSentiment,
  } = useApp();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  // The chips row hides its scrollbar, so a mouse wheel must scroll it
  // horizontally. Native listener: React registers wheel as passive, which
  // would ignore preventDefault and scroll the page instead.
  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      el.scrollLeft += delta;
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const filterActiveCount =
    selectedSources.length + (selectedSentiment !== 'all' ? 1 : 0);

  const chip = (key: Category | 'all', label: string) => {
    const active = selectedCategory === key;
    // Active chips wear their category colour; 'all' wears the brand gradient.
    const activeClass = key === 'all' ? 'text-white' : `${CATEGORY_BADGE_CLASS[key]}`;
    return (
      <button
        key={key}
        onClick={() => setSelectedCategory(key)}
        className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
          active
            ? activeClass
            : isDark
              ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        }`}
        style={active && key === 'all' ? { background: 'var(--brand-grad, #06b6d4)' } : undefined}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className={`sticky top-0 z-30 border-b backdrop-blur-xl px-4 py-3 ${
        isDark ? 'bg-slate-950/85 border-slate-800' : 'bg-slate-50/85 border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          ref={chipsRef}
          className="flex-1 min-w-0 flex gap-2 overflow-x-auto overscroll-x-contain"
          style={{ scrollbarWidth: 'none' }}
        >
          {chip('all', t.allCategories)}
          {CATEGORIES.map((c) => chip(c, CATEGORY_LABELS[c]))}
        </div>

        <div ref={filterRef} className="relative shrink-0">
          <button
            onClick={() => setFilterOpen((p) => !p)}
            aria-label={t.filter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterActiveCount > 0
                ? 'text-[var(--brand,#06b6d4)]'
                : isDark
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal size={16} />
            {filterActiveCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-white text-[11px] font-bold" style={{ background: 'var(--brand, #06b6d4)' }}>
                {filterActiveCount}
              </span>
            )}
          </button>
          <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} />
        </div>
      </div>
    </div>
  );
}
