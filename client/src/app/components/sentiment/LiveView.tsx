import { Link } from 'react-router';
import { Clock3 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { getArticleId } from '../../services/newsAPI';
import type { NewsArticle } from '../../types/article';
import type { SentimentType } from '../../types/sentiment';
import { panelBaseClass, chartTextColor, chartMutedColor } from './shared';

interface LiveViewProps {
  articles: NewsArticle[];
  categoryLabel: string;
}

const formatRelativeTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMinutes = Math.round((Date.now() - date.getTime()) / (1000 * 60));
  if (diffMinutes <= 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.round(diffHours / 24)}d ago`;
};

const sentimentTextClass: Record<SentimentType, string> = {
  positive: 'text-emerald-500',
  neutral: 'text-gray-500',
  negative: 'text-red-500',
};

export function LiveView({ articles, categoryLabel }: LiveViewProps) {
  const { t, isDark } = useApp();
  const mutedColor = chartMutedColor(isDark);
  const textColor = chartTextColor(isDark);

  return (
    <div className={`rounded-2xl border shadow-lg p-4 ${panelBaseClass(isDark)}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Clock3 size={13} className="text-white" />
          </div>
          <h3 className={`font-poppins text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
            Live View
          </h3>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
          {articles.length} articles
        </span>
      </div>

      <p className="text-[11px] mb-2" style={{ color: mutedColor }}>
        Category: {categoryLabel}
      </p>

      <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
        {articles.length === 0 ? (
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.noResults}</p>
        ) : (
          articles.map((article) => (
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
  );
}
