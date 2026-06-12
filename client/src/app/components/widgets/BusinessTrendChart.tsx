import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../contexts/AppContext';
import { useBusinessTrend } from '../../hooks/useStats';

/** 14-day Business pulse under the feed header when the Business category is
 * active: bars = articles/day, line = average sentiment polarity (−1…+1).
 * Loaded lazily — recharts stays out of the main bundle. */
export function BusinessTrendChart() {
  const { t, isDark } = useApp();
  const { data = [] } = useBusinessTrend(14);

  if (data.length < 2) return null;

  const axisColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <div
      className={`mx-4 mt-4 rounded-2xl border p-4 ${
        isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3 className={`font-poppins text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {t.businessTrend}
        </h3>
        <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {t.articlesPerDay} · {t.avgTone}
        </span>
      </div>
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: axisColor }}
              tickFormatter={(d: string) => d.slice(5)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="count"
              tick={{ fontSize: 10, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis yAxisId="tone" hide domain={[-1, 1]} />
            <Tooltip
              contentStyle={{
                background: isDark ? '#1e293b' : '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar
              yAxisId="count"
              dataKey="articles"
              name={t.articlesPerDay}
              fill="var(--brand, #06b6d4)"
              opacity={0.75}
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="tone"
              type="monotone"
              dataKey="avgPolarity"
              name={t.avgTone}
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
