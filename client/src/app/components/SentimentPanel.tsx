import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '../contexts/AppContext';
import { Activity, Clock3, TrendingUp, Users } from 'lucide-react';
import { CATEGORY_BADGE_CLASS, CATEGORIES, CATEGORY_LABELS } from '../constants';
import {
  getArticleId,
  getAllArticles,
  getDatasetSnapshot,
  getLiveEngagement,
  getSentimentDistribution,
  getTrendingKeywords,
  NewsCategoryFilter,
  SentimentType,
} from '../services/newsAPI';

const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#6b7280',
  negative: '#ef4444',
};

const SENTIMENT_ROTATE_MS = 7000;

const CustomTooltip = ({ active, payload, isDark, total }: any) => {
  if (active && payload && payload.length) {
    const value = Number(payload[0].value ?? 0);
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

    return (
      <div className={`px-3 py-2 rounded-lg text-xs shadow-lg ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-gray-800 border border-gray-100'}`}>
        <p className="font-semibold">{payload[0].name}</p>
        <p>{value} articles ({percentage}%)</p>
      </div>
    );
  }
  return null;
};

const formatRelativeTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = Date.now();
  const diffMinutes = Math.round((now - date.getTime()) / (1000 * 60));

  if (diffMinutes <= 1) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

const formatCount = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
};

const formatSnapshotDate = (value: string | null): string => {
  if (!value) {
    return 'Unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const sentimentTextClass: Record<SentimentType, string> = {
  positive: 'text-emerald-500',
  neutral: 'text-gray-500',
  negative: 'text-red-500',
};

const sentimentPillClass: Record<SentimentType, string> = {
  positive: 'bg-emerald-100 text-emerald-700',
  neutral: 'bg-gray-100 text-gray-700',
  negative: 'bg-red-100 text-red-700',
};

export function SentimentPanel() {
  const { t, isDark, selectedCategory } = useApp();
  const [tick, setTick] = useState(Date.now());
  const [sentimentCategoryIndex, setSentimentCategoryIndex] = useState(0);
  const datasetSnapshot = useMemo(() => getDatasetSnapshot(), []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick(Date.now());
    }, 12_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (selectedCategory === 'all') {
      return;
    }

    const categoryIndex = CATEGORIES.indexOf(selectedCategory);
    if (categoryIndex >= 0) {
      setSentimentCategoryIndex(categoryIndex);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCategory !== 'all') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSentimentCategoryIndex((prev) => (prev + 1) % CATEGORIES.length);
    }, SENTIMENT_ROTATE_MS);

    return () => window.clearInterval(intervalId);
  }, [selectedCategory]);

  const analyticsCategory: NewsCategoryFilter = selectedCategory;
  const rotatingSentimentCategory = selectedCategory === 'all'
    ? CATEGORIES[sentimentCategoryIndex]
    : selectedCategory;

  const handleNextSentimentCategory = () => {
    setSentimentCategoryIndex((prev) => (prev + 1) % CATEGORIES.length);
  };

  const allArticles = useMemo(() => getAllArticles(analyticsCategory), [analyticsCategory]);
  const overallSentimentDistribution = useMemo(() => getSentimentDistribution('all'), []);
  const categorySentimentDistribution = useMemo(
    () => getSentimentDistribution(rotatingSentimentCategory),
    [rotatingSentimentCategory]
  );
  const trendingKeywords = useMemo(() => getTrendingKeywords(10, analyticsCategory), [analyticsCategory]);
  const allKeywords = useMemo(() => getTrendingKeywords(10000, analyticsCategory), [analyticsCategory]);
  const liveEngagement = useMemo(() => getLiveEngagement(tick, 6, analyticsCategory), [tick, analyticsCategory]);

  const overallSentimentData = overallSentimentDistribution.map((item) => ({
    name: t[item.type],
    value: item.count,
    color: SENTIMENT_COLORS[item.type],
    type: item.type,
  }));

  const categorySentimentData = categorySentimentDistribution.map((item) => ({
    name: t[item.type],
    value: item.count,
    color: SENTIMENT_COLORS[item.type],
    type: item.type,
  }));

  const overallTotal = overallSentimentData.reduce((sum, item) => sum + item.value, 0);
  const categoryTotal = categorySentimentData.reduce((sum, item) => sum + item.value, 0);
  const maxKeywordCount = Math.max(1, ...trendingKeywords.map((item) => item.count));
  const textColor = isDark ? '#e2e8f0' : '#374151';
  const mutedColor = isDark ? '#64748b' : '#9ca3af';
  const sentimentCategoryLabel = CATEGORY_LABELS[rotatingSentimentCategory];
  const sentimentCategoryBadgeClass = CATEGORY_BADGE_CLASS[rotatingSentimentCategory];
  const activeDataCategoryLabel = selectedCategory === 'all' ? t.allCategories : CATEGORY_LABELS[selectedCategory];
  const lastScrapedLabel = formatSnapshotDate(datasetSnapshot.scrapedAt);
  const modelCount = Object.keys(datasetSnapshot.aiModels).length;

  const panelBase = isDark
    ? 'bg-slate-800/80 border-slate-700/50 backdrop-blur-md'
    : 'bg-white/80 border-white/60 backdrop-blur-md';

  return (
    <div className="space-y-4 w-full">
      {/* Sentiment Distribution */}
      <div className={`rounded-2xl border shadow-lg p-4 ${panelBase}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Activity size={13} className="text-white" />
            </div>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
              {t.sentimentDistribution}
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900/30' : 'border-gray-100 bg-gray-50/70'}`}>
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Overall</span>
              <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
                {t.allCategories}
              </span>
            </div>

            <div className="h-[130px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overallSentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={52}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {overallSentimentData.map((entry, i) => (
                      <Cell key={`overall-${entry.type}-${i}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip isDark={isDark} total={overallTotal} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {overallSentimentData.map((item) => {
                const percentage = overallTotal > 0 ? Math.round((item.value / overallTotal) * 100) : 0;
                return (
                  <div key={`overall-row-${item.type}`} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs flex-1 truncate" style={{ color: textColor }}>{item.name}</span>
                      <span className="text-xs font-semibold" style={{ color: item.color }}>
                        {item.value} ({percentage}%)
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2">
              <span style={{ color: mutedColor }}>Total analyzed (Overall)</span>
              <span className="font-semibold" style={{ color: textColor }}>{overallTotal}</span>
            </div>
          </div>

          <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900/30' : 'border-gray-100 bg-gray-50/70'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Per Category</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${sentimentCategoryBadgeClass}`}>
                  {sentimentCategoryLabel}
                </span>
              </div>

              {selectedCategory === 'all' && (
                <button
                  type="button"
                  onClick={handleNextSentimentCategory}
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold transition-colors ${isDark ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'}`}
                >
                  {t.next}
                </button>
              )}
            </div>

            <div className="h-[130px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={52}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categorySentimentData.map((entry, i) => (
                      <Cell key={`category-${entry.type}-${i}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip isDark={isDark} total={categoryTotal} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {categorySentimentData.map((item) => {
                const percentage = categoryTotal > 0 ? Math.round((item.value / categoryTotal) * 100) : 0;
                return (
                  <div key={`category-row-${item.type}`} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs flex-1 truncate" style={{ color: textColor }}>{item.name}</span>
                      <span className="text-xs font-semibold" style={{ color: item.color }}>
                        {item.value} ({percentage}%)
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2">
              <span style={{ color: mutedColor }}>Total analyzed ({sentimentCategoryLabel})</span>
              <span className="font-semibold" style={{ color: textColor }}>{categoryTotal}</span>
            </div>

            {selectedCategory === 'all' && (
              <div className="mt-2">
                <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                  <motion.div
                    key={sentimentCategoryLabel}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: SENTIMENT_ROTATE_MS / 1000, ease: 'linear' }}
                    className="h-full rounded-full bg-cyan-500"
                  />
                </div>
                <p className="text-[11px] mt-1" style={{ color: mutedColor }}>
                  Auto-rotate every {Math.round(SENTIMENT_ROTATE_MS / 1000)}s
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live View */}
      <div className={`rounded-2xl border shadow-lg p-4 ${panelBase}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Clock3 size={13} className="text-white" />
            </div>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
              Live View
            </h3>
          </div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
            {allArticles.length} articles
          </span>
        </div>

        <p className="text-[11px] mb-2" style={{ color: mutedColor }}>
          Category: {activeDataCategoryLabel}
        </p>

        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {allArticles.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.noResults}</p>
          ) : (
            allArticles.map((article) => (
              <Link
                key={article.url}
                to={`/article/${getArticleId(article)}`}
                className={`block rounded-xl p-2.5 transition-colors ${isDark ? 'hover:bg-slate-700/60' : 'hover:bg-gray-50'}`}
              >
                <p className={`text-sm font-medium line-clamp-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                  {article.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
                  <span style={{ color: mutedColor }}>{formatRelativeTime(article.publishedAt)}</span>
                  <span className={`${isDark ? 'text-slate-400' : 'text-gray-500'}`}>•</span>
                  <span style={{ color: textColor }}>{article.topic}</span>
                  <span className={`${isDark ? 'text-slate-400' : 'text-gray-500'}`}>•</span>
                  <span className={sentimentTextClass[article.sentiment.type]}>{article.sentiment.type}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Trending Topics */}
      <div className={`rounded-2xl border shadow-lg p-4 ${panelBase}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <TrendingUp size={13} className="text-white" />
          </div>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
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
                      style={{
                        width: `${(topic.count / maxKeywordCount) * 100}%`,
                        background: '#06b6d4',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Engagement */}
      <div className={`rounded-2xl border shadow-lg p-4 ${panelBase}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Users size={13} className="text-white" />
          </div>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
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

      <div className={`rounded-2xl border shadow-lg p-4 ${panelBase}`}>
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/90'}`}>
            <p className="text-xs" style={{ color: mutedColor }}>Articles</p>
            <p className="text-lg font-bold text-cyan-500">{allArticles.length}</p>
          </div>
          <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/90'}`}>
            <p className="text-xs" style={{ color: mutedColor }}>Keywords tracked</p>
            <p className="text-lg font-bold text-violet-500">{allKeywords.length}</p>
          </div>
          <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/90'}`}>
            <p className="text-xs" style={{ color: mutedColor }}>Sources</p>
            <p className="text-lg font-bold text-emerald-500">{datasetSnapshot.sourceCount}</p>
          </div>
          <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/90'}`}>
            <p className="text-xs" style={{ color: mutedColor }}>AI models</p>
            <p className="text-lg font-bold text-amber-500">{modelCount}</p>
          </div>
        </div>
        <p className="text-[11px] mt-2" style={{ color: mutedColor }}>
          Snapshot from latest scraper run ({activeDataCategoryLabel})
        </p>
        <p className="text-[11px] mt-1" style={{ color: mutedColor }}>
          Last scraped: {lastScrapedLabel}
        </p>
      </div>
    </div>
  );
}
