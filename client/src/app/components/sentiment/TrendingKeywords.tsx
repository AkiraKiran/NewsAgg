import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { getTrendingKeywords } from '../../services/newsAPI';
import type { NewsCategoryFilter, TrendingKeyword } from '../../types/article';
import { panelBaseClass, chartTextColor, chartMutedColor } from './shared';

export function TrendingKeywords() {
  const { t, isDark, selectedCategory } = useApp();
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);

  const analyticsCategory: NewsCategoryFilter = selectedCategory;

  useEffect(() => {
    getTrendingKeywords(10, analyticsCategory).then(setTrendingKeywords);
  }, [analyticsCategory]);

  const maxKeywordCount = Math.max(1, ...trendingKeywords.map((item) => item.count));
  const textColor = chartTextColor(isDark);
  const mutedColor = chartMutedColor(isDark);

  return (
    <div className={`rounded-2xl border shadow-lg p-4 ${panelBaseClass(isDark)}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
          <TrendingUp size={13} className="text-white" />
        </div>
        <h3 className={`font-poppins text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
          {t.trendingTopics}
        </h3>
      </div>

      <div className="space-y-2">
        {trendingKeywords.length === 0 ? (
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.noResults}</p>
        ) : (
          trendingKeywords.map((topic, i) => (
            <div key={topic.keyword} className="flex items-center gap-2">
              <span className="text-xs font-bold w-4" style={{ color: mutedColor }}>{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium" style={{ color: textColor }}>{topic.keyword}</span>
                  <span className="text-xs" style={{ color: mutedColor }}>{topic.count}</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(topic.count / maxKeywordCount) * 100}%`, background: '#06b6d4' }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
