import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Clock3, PlayCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CATEGORY_BADGE_CLASS, TOPIC_TO_CATEGORY } from '../constants';
import { getArticleId, NewsArticle, SentimentType } from '../services/newsAPI';
import { ImageWithFallback } from './utils/ImageWithFallback';

const SENTIMENT_STYLE: Record<SentimentType, { bg: string; dot: string; dark: string }> = {
  positive: { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', dark: 'bg-emerald-900/40 text-emerald-300' },
  neutral: { bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', dark: 'bg-gray-700 text-gray-300' },
  negative: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500', dark: 'bg-red-900/40 text-red-300' },
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
};

interface NewsCardProps {
  article: NewsArticle;
  index: number;
}

export function NewsCard({ article, index }: NewsCardProps) {
  const { t, isDark } = useApp();
  const articleId = getArticleId(article);
  const sentiment = article.sentiment.type;
  const sentStyle = SENTIMENT_STYLE[sentiment];
  const categoryClass = CATEGORY_BADGE_CLASS[TOPIC_TO_CATEGORY[article.topic]];
  const preview = article.aiSummary || article.description || 'No summary available';
  const secondaryImage = article.images.find((image) => !image.isPrimary)?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.4) }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link to={`/article/${articleId}`} className="block h-full">
        <div className={`h-full rounded-2xl border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col ${isDark ? 'bg-slate-800/80 border-slate-700/50 backdrop-blur-md hover:border-slate-500' : 'bg-white/85 border-white/60 backdrop-blur-md hover:border-cyan-200'}`}>
          <div className="relative overflow-hidden h-52 flex-shrink-0">
            <ImageWithFallback
              src={article.urlToImage || secondaryImage || undefined}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />

            <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
              <div className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${categoryClass}`}>
                {article.topic}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {article.videoUrl && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    <PlayCircle size={12} />
                    Video
                  </span>
                )}
                {article.isPremium && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-1 text-[11px] font-medium text-white">
                    <ShieldAlert size={12} />
                    Premium
                  </span>
                )}
              </div>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? sentStyle.dark : sentStyle.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sentStyle.dot}`} />
                {article.sentiment.type}
              </span>

              {article.section && (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                  {article.section}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col flex-1 p-4">
            <div className="flex items-center gap-2 mb-3 min-w-0">
              {article.source.logo ? (
                <img
                  src={article.source.logo}
                  alt={article.source.name}
                  className={`w-8 h-8 rounded-full object-cover flex-shrink-0 ${isDark ? 'bg-slate-900/80' : 'bg-white'}`}
                />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-600'}`}>
                  {article.source.name.slice(0, 1)}
                </div>
              )}

              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                  {article.source.name}
                </p>
                <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {article.author || 'Unknown'}
                </p>
              </div>
            </div>

            <h3 className={`font-semibold leading-snug mb-2 line-clamp-2 group-hover:text-cyan-500 transition-colors ${isDark ? 'text-slate-100' : 'text-gray-900'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
              {article.title}
            </h3>

            <p className={`text-sm line-clamp-4 flex-1 mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {preview}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {article.aiTopLabel && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${isDark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-700'}`}>
                  <Sparkles size={12} />
                  {article.aiTopLabel}
                </span>
              )}

              {article.keywords.slice(0, 2).map((keyword) => (
                <span
                  key={`${article.id}-${keyword}`}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}
                >
                  #{keyword}
                </span>
              ))}
            </div>

            <div className={`flex items-center justify-between gap-3 pt-3 border-t text-xs ${isDark ? 'border-slate-700 text-slate-400' : 'border-gray-100 text-gray-500'}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock3 size={13} className="flex-shrink-0" />
                <span className="truncate">
                  {article.readability.readingTimeMin > 0 ? `${article.readability.readingTimeMin} min read` : 'Quick read'}
                </span>
              </div>

              <span className="flex-shrink-0">{formatDate(article.publishedAt)}</span>
            </div>

            <div className={`flex items-center justify-between gap-3 mt-2 text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <span className="truncate">{article.source.domain || t.source}</span>
              {typeof article.aiRelevance === 'number' && (
                <span className={`${isDark ? 'text-cyan-300' : 'text-cyan-700'} font-semibold`}>
                  AI {(article.aiRelevance * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
