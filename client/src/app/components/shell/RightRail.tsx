import { lazy, Suspense, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { SearchBox } from './SearchBox';
import { FooterCompact } from './Footer';

// Lazy per tab: Insights pulls recharts (~300kB) — it must not ride in the
// main bundle just because the shell renders on every page.
const PulseRail = lazy(() =>
  import('../posts/PulseRail').then((m) => ({ default: m.PulseRail }))
);
const InsightsRail = lazy(() =>
  import('./InsightsRail').then((m) => ({ default: m.InsightsRail }))
);

type RailTab = 'pulse' | 'insights';

/** Right rail (≥lg): search on top, then a Pulse | Insights tab switcher.
 * Pulse = the social feed beside the news (quotes + user posts); Insights =
 * compact sentiment analytics. The inactive tab is unmounted so its data
 * fetches never fire until viewed. */
const MarketsWidget = lazy(() =>
  import('../widgets/MarketsWidget').then((m) => ({ default: m.MarketsWidget }))
);

export function RightRail() {
  const { t, isDark, selectedCategory } = useApp();
  const [tab, setTab] = useState<RailTab>('insights');

  const tabButton = (key: RailTab, label: string) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
        tab === key
          ? 'text-white'
          : isDark
            ? 'text-slate-400 hover:text-slate-200'
            : 'text-slate-500 hover:text-slate-800'
      }`}
      style={tab === key ? { background: 'var(--brand-grad, #06b6d4)' } : undefined}
    >
      {label}
    </button>
  );

  return (
    <aside className="hidden lg:block flex-1 min-w-[300px] max-w-[560px]">
      <div className="sticky top-0 h-screen flex flex-col gap-3 px-4 py-4 overflow-hidden">
        <SearchBox />

        {/* Market data appears alongside Business news */}
        {selectedCategory === 'business' && (
          <Suspense fallback={null}>
            <MarketsWidget />
          </Suspense>
        )}

        <div
          className={`flex gap-1 rounded-full border p-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
          role="tablist"
        >
          {tabButton('insights', t.insights)}
          {tabButton('pulse', t.pulse)}
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto pb-6 pr-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          <Suspense
            fallback={
              <div className="flex justify-center py-10">
                <div className={`w-6 h-6 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
              </div>
            }
          >
            {tab === 'pulse' ? <PulseRail /> : <InsightsRail />}
          </Suspense>
        </div>

        <FooterCompact />
      </div>
    </aside>
  );
}
