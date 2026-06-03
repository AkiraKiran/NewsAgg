import { useApp } from '../../contexts/AppContext';
import type { DatasetSnapshot } from '../../types/api';
import { panelBaseClass, chartMutedColor } from './shared';

interface DatasetStatsProps {
  articleCount: number;
  keywordCount: number;
  snapshot: DatasetSnapshot;
  categoryLabel: string;
}

const formatSnapshotDate = (value: string | null): string => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export function DatasetStats({ articleCount, keywordCount, snapshot, categoryLabel }: DatasetStatsProps) {
  const { isDark } = useApp();
  const mutedColor = chartMutedColor(isDark);
  const modelCount = Object.keys(snapshot.aiModels).length;
  const lastScrapedLabel = formatSnapshotDate(snapshot.scrapedAt);

  return (
    <div className={`rounded-2xl border shadow-lg p-4 ${panelBaseClass(isDark)}`}>
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/90'}`}>
          <p className="text-xs" style={{ color: mutedColor }}>Articles</p>
          <p className="text-lg font-bold text-cyan-500">{articleCount}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/90'}`}>
          <p className="text-xs" style={{ color: mutedColor }}>Keywords tracked</p>
          <p className="text-lg font-bold text-violet-500">{keywordCount}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/90'}`}>
          <p className="text-xs" style={{ color: mutedColor }}>Sources</p>
          <p className="text-lg font-bold text-emerald-500">{snapshot.sourceCount}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/90'}`}>
          <p className="text-xs" style={{ color: mutedColor }}>AI models</p>
          <p className="text-lg font-bold text-amber-500">{modelCount}</p>
        </div>
      </div>
      <p className="text-[11px] mt-2" style={{ color: mutedColor }}>
        Snapshot from latest scraper run ({categoryLabel})
      </p>
      <p className="text-[11px] mt-1" style={{ color: mutedColor }}>
        Last scraped: {lastScrapedLabel}
      </p>
    </div>
  );
}
