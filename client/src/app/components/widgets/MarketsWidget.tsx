import { LineChart as LineChartIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useMarkets } from '../../hooks/useStats';

/** Tiny dependency-free sparkline (recharts would drag ~300kB into the shell
 * bundle for a 60×20 line). */
function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const w = 64;
  const h = 20;
  const path = points
    .map((p, i) => `${((i / (points.length - 1)) * w).toFixed(1)},${(h - ((p - min) / span) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline
        points={path}
        fill="none"
        stroke={up ? '#10b981' : '#f43f5e'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DeltaChip({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span
      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
        up ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10'
      }`}
    >
      {up ? '+' : ''}
      {pct.toFixed(2)}%
    </span>
  );
}

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** Market snapshot for the Business view: USD exchange rates (IDR/TWD), US
 * indices and BTC/ETH — all server-cached keyless upstreams. */
export function MarketsWidget() {
  const { isDark, t } = useApp();
  const { data, isLoading } = useMarkets();

  if (isLoading || !data) return null;
  const anyStale = Boolean(data.fx?.stale || data.indices?.stale || data.crypto?.stale);

  const row = `flex items-center justify-between gap-2 py-1.5`;
  const label = `text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`;
  const value = `text-xs font-semibold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-grad, #06b6d4)' }}
        >
          <LineChartIcon size={13} className="text-white" />
        </div>
        <h3 className={`font-poppins text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {t.markets}
        </h3>
        {anyStale && (
          <span className={`ml-auto text-[10px] uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {t.delayedData}
          </span>
        )}
      </div>

      {data.fx && (
        <div className={`border-b pb-1 mb-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className={row}>
            <span className={label}>USD / IDR</span>
            <span className={value}>{nf.format(data.fx.idr)}</span>
          </div>
          <div className={row}>
            <span className={label}>USD / TWD</span>
            <span className={value}>{nf2.format(data.fx.twd)}</span>
          </div>
        </div>
      )}

      {data.indices?.items.map((ix) => (
        <div key={ix.symbol} className={row}>
          <span className={label}>{ix.name}</span>
          <div className="flex items-center gap-2">
            <Sparkline points={ix.spark} up={(ix.changePct ?? 0) >= 0} />
            <span className={value}>{nf2.format(ix.close)}</span>
            <DeltaChip pct={ix.changePct} />
          </div>
        </div>
      ))}

      {data.crypto?.items.map((c) => (
        <div key={c.id} className={row}>
          <span className={label}>{c.symbol}</span>
          <div className="flex items-center gap-2">
            <Sparkline points={c.spark} up={(c.changePct24h ?? 0) >= 0} />
            <span className={value}>${nf.format(c.price)}</span>
            <DeltaChip pct={c.changePct24h} />
          </div>
        </div>
      ))}
    </div>
  );
}
