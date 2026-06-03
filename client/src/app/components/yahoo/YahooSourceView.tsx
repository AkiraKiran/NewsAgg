import { useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Clock3, PlayCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { TOPIC_BADGE_CLASS, sourceLogoUrl } from '../../constants';
import { getArticleId } from '../../services/newsAPI';
import type { NewsArticle } from '../../types/article';
import type { SentimentType } from '../../types/sentiment';
import { ImageWithFallback } from '../utils/ImageWithFallback';

// Noto Serif TC is a large CJK webfont, so we load it from the Google Fonts CDN
// only when this view actually mounts (CLAUDE.md: "only load when source is Yahoo
// TW"). The `font-noto-serif-tc` utility is registered in styles/theme.css.
const FONT_LINK_ID = 'noto-serif-tc-font';
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600;700&display=swap';

function useNotoSerifTC() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
    // Left in place after unmount: the font stays cached for re-visits, and
    // removing it would flash unstyled text if the view remounts.
  }, []);
}

const SENTIMENT_STYLE: Record<SentimentType, { bg: string; dot: string; dark: string }> = {
  positive: { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', dark: 'bg-emerald-900/40 text-emerald-300' },
  neutral: { bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', dark: 'bg-gray-700 text-gray-300' },
  negative: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500', dark: 'bg-red-900/40 text-red-300' },
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

interface YahooSourceViewProps {
  articles: NewsArticle[];
}

/**
 * Dense editorial list layout for Yahoo TW (zh-TW) articles — thumbnail left,
 * title right — instead of the card grid used for English sources. Titles and
 * descriptions render in `font-noto-serif-tc`. Trigger upstream on
 * `article.source.domain === 'tw.news.yahoo.com'`.
 */
export function YahooSourceView({ articles }: YahooSourceViewProps) {
  const { t, isDark } = useApp();
  useNotoSerifTC();

  if (articles.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 text-center ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
        <div className="text-5xl mb-4">📰</div>
        <p className="text-lg font-medium">{t.noResults}</p>
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-slate-800/60 border-slate-700/60 backdrop-blur-md' : 'bg-white/85 border-gray-200 backdrop-blur-md'
      }`}
    >
      {/* Source header — neutral accent (not Yahoo purple), per design spec */}
      <header
        className={`flex items-center gap-3 px-4 py-3 border-b ${
          isDark ? 'border-slate-700/60' : 'border-gray-100'
        }`}
      >
        <img
          src={sourceLogoUrl('tw.news.yahoo.com')}
          alt="Yahoo TW"
          className={`w-7 h-7 rounded-md object-contain flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}
        />
        <div className="min-w-0">
          <p className={`font-poppins text-sm font-semibold leading-tight ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            Yahoo TW
          </p>
          <p className={`font-noto-serif-tc text-[11px] leading-tight ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            雅虎新聞
          </p>
        </div>
        <span
          className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full ${
            isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {articles.length}
        </span>
      </header>

      <ul className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-gray-100'}`}>
        {articles.map((article, index) => {
          const articleId = getArticleId(article);
          const sentiment = article.sentiment.type;
          const sentStyle = SENTIMENT_STYLE[sentiment];
          const thumb = article.urlToImage || article.images.find((img) => !img.isPrimary)?.url;
          const readMin = article.readability.readingTimeMin;

          return (
            <motion.li
              key={`${article.url}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
            >
              <Link
                to={`/article/${articleId}`}
                className={`group flex gap-3.5 p-3 sm:p-4 transition-colors ${
                  isDark ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'
                }`}
              >
                {/* Thumbnail — 80x60 per spec */}
                <div className="relative w-20 h-[60px] flex-shrink-0 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src={thumb || undefined}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {article.videoUrl && (
                    <span className="absolute bottom-1 right-1 inline-flex items-center justify-center rounded-full bg-black/60 p-0.5 text-white backdrop-blur-sm">
                      <PlayCircle size={12} />
                    </span>
                  )}
                </div>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${TOPIC_BADGE_CLASS[article.topic]}`}>
                      {article.topic}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDark ? sentStyle.dark : sentStyle.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sentStyle.dot}`} />
                      {t[sentiment]}
                    </span>
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {formatDate(article.publishedAt)}
                    </span>
                  </div>

                  <h3
                    lang="zh-Hant"
                    className={`font-noto-serif-tc text-[15px] font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-indigo-500 ${
                      isDark ? 'text-slate-100' : 'text-gray-900'
                    }`}
                  >
                    {article.title}
                  </h3>

                  {article.description && (
                    <p
                      lang="zh-Hant"
                      className={`font-noto-serif-tc text-xs mt-1 line-clamp-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
                    >
                      {article.description}
                    </p>
                  )}

                  <div className={`flex items-center gap-1.5 mt-1.5 text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    <Clock3 size={12} className="flex-shrink-0 opacity-70" />
                    <span className="font-medium">{readMin > 0 ? `${readMin} min` : 'Quick read'}</span>
                  </div>
                </div>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
