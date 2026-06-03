import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Users } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { getLiveEngagement } from '../../services/newsAPI';
import type { LiveEngagementItem, NewsCategoryFilter } from '../../types/article';
import type { SentimentType } from '../../types/sentiment';
import { panelBaseClass, chartTextColor, chartMutedColor } from './shared';

const formatCount = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const sentimentPillClass: Record<SentimentType, string> = {
  positive: 'bg-emerald-100 text-emerald-700',
  neutral: 'bg-gray-100 text-gray-700',
  negative: 'bg-red-100 text-red-700',
};

export function LiveEngagement() {
  const { t, isDark, selectedCategory } = useApp();
  const [tick, setTick] = useState(Date.now());
  const [liveEngagement, setLiveEngagement] = useState<LiveEngagementItem[]>([]);

  const analyticsCategory: NewsCategoryFilter = selectedCategory;

  // Refresh the tick every 12s so the feed re-fetches with fresh "live" numbers.
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 12_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    getLiveEngagement(tick, 6, analyticsCategory).then(setLiveEngagement);
  }, [tick, analyticsCategory]);

  const textColor = chartTextColor(isDark);
  const mutedColor = chartMutedColor(isDark);

  return (
    <div className={`rounded-2xl border shadow-lg p-4 ${panelBaseClass(isDark)}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <Users size={13} className="text-white" />
        </div>
        <h3 className={`font-poppins text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
          Live Engagement
        </h3>
      </div>

      <div className="space-y-2.5">
        {liveEngagement.length === 0 ? (
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.noResults}</p>
        ) : (
          liveEngagement.map((item) => (
            <Link
              key={item.articleId}
              to={`/article/${item.articleId}`}
              className={`block rounded-xl p-2.5 transition-colors ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50/90 hover:bg-gray-100'}`}
            >
              <p className={`text-sm font-medium line-clamp-1 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{item.title}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
                <span style={{ color: mutedColor }}>{item.topic}</span>
                <span className={`${isDark ? 'text-slate-400' : 'text-gray-500'}`}>•</span>
                <span className={`${sentimentPillClass[item.sentiment]} px-2 py-0.5 rounded-full`}>{item.sentiment}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div>
                  <p style={{ color: mutedColor }}>Views</p>
                  <p className="font-semibold" style={{ color: textColor }}>{formatCount(item.views)}</p>
                </div>
                <div>
                  <p style={{ color: mutedColor }}>Likes</p>
                  <p className="font-semibold" style={{ color: textColor }}>{formatCount(item.likes)}</p>
                </div>
                <div>
                  <p style={{ color: mutedColor }}>Interactions</p>
                  <p className="font-semibold" style={{ color: textColor }}>{formatCount(item.interactions)}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-xs" style={{ color: mutedColor }}>Updates every 12 seconds</span>
      </div>
    </div>
  );
}
