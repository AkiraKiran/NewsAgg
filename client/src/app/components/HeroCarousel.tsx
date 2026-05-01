import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Clock3, PlayCircle, TrendingUp } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TOPIC_BADGE_CLASS } from '../constants';
import { getArticleId, newsAPI, NewsArticle, SentimentType } from '../services/newsAPI';

interface SentimentBadgeProps {
  sentiment: SentimentType;
}

function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  const colors = {
    positive: 'bg-emerald-500/90 text-white',
    neutral: 'bg-gray-500/90 text-white',
    negative: 'bg-red-500/90 text-white',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${colors[sentiment as keyof typeof colors]}`}>
      {sentiment}
    </span>
  );
}

interface HeroCarouselProps {
  scrollY: number;
}

export function HeroCarousel({ scrollY }: HeroCarouselProps) {
  const { t, isDark } = useApp();
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [headlines, setHeadlines] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const isCompact = scrollY > 280;
  const heroHeight = isCompact ? 100 : Math.max(420 - scrollY * 0.5, 100);

  useEffect(() => {
    const fetchHeadlines = async () => {
      try {
        const response = await newsAPI.getTopHeadlines('all', 5);
        if (response.success && response.data?.articles) {
          setHeadlines(response.data.articles.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to fetch headlines:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeadlines();
  }, []);

  useEffect(() => {
    if (isHovered || headlines.length === 0) return;
    const interval = setInterval(() => {
      setCurrent(p => (p + 1) % headlines.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHovered, headlines.length]);

  const prev = () => setCurrent(p => (p - 1 + headlines.length) % headlines.length);
  const next = () => setCurrent(p => (p + 1) % headlines.length);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString();
  };

  if (loading || headlines.length === 0) {
    return (
      <div style={{ height: `${heroHeight}px` }} className={`${isDark ? 'bg-slate-800' : 'bg-gray-100'} transition-all duration-300 flex items-center justify-center`}>
        <div className="text-center text-gray-500">
          <div className="text-3xl mb-2">⏳</div>
          <p>Loading headlines...</p>
        </div>
      </div>
    );
  }

  const article = headlines[current];
  const preview = article.aiSummary || article.description || 'No summary available';
  const topicClass = TOPIC_BADGE_CLASS[article.topic];

  return (
    <div
      className="relative overflow-hidden transition-all duration-300 ease-out"
      style={{ height: `${heroHeight}px` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <img
            src={article.urlToImage || article.images[0]?.url || 'https://via.placeholder.com/800x400?text=No+Image'}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Trending badge */}
      {!isCompact && (
        <div className="absolute top-4 left-6 flex items-center gap-2 z-10">
          <div className="flex items-center gap-1.5 bg-cyan-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
            <TrendingUp size={11} />
            {t.topHeadlines}
          </div>
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`content-${current}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.7 }}
          className="absolute bottom-0 left-0 right-0 p-6 z-10"
        >
          {!isCompact ? (
            <Link to={`/article/${getArticleId(article)}`} className="block group">
              <div className="flex items-center gap-2 mb-2">
                <SentimentBadge sentiment={article.sentiment.type} />
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${topicClass}`}>{article.topic}</span>
                <span className="text-white/70 text-xs">{article.source.name}</span>
                {article.section && (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm">
                    {article.section}
                  </span>
                )}
                {article.videoUrl && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    <PlayCircle size={12} />
                    Video
                  </span>
                )}
              </div>
              <h2 className="text-white text-4xl md:text-5xl font-bold leading-tight mb-2 group-hover:text-cyan-300 transition-colors" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {article.title}
              </h2>
              <p className="text-white/75 text-sm line-clamp-2 mb-3 max-w-2xl">
                {preview}
              </p>
              <div className="flex items-center gap-4 text-white/60 text-xs flex-wrap">
                <span>{t.author}: {article.author || 'Unknown'}</span>
                <span>{t.publishedAt}: {formatDate(article.publishedAt)}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={12} />
                  {article.readability.readingTimeMin > 0 ? `${article.readability.readingTimeMin} min read` : 'Quick read'}
                </span>
              </div>
            </Link>
          ) : (
            <Link to={`/article/${getArticleId(article)}`} className="flex items-center gap-3 group">
              <div className="flex items-center gap-2 min-w-0">
                <SentimentBadge sentiment={article.sentiment.type} />
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${topicClass}`}>{article.topic}</span>
                <span className="text-white font-semibold text-sm truncate group-hover:text-cyan-300 transition-colors">{article.title}</span>
              </div>
              <span className="text-white/60 text-xs flex-shrink-0">{article.source.name}</span>
            </Link>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dots indicator */}
      {!isCompact && (
        <div className="absolute bottom-4 right-6 flex items-center gap-1.5 z-10">
          {headlines.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`transition-all duration-300 rounded-full ${i === current ? 'w-6 h-2 bg-cyan-400' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-10">
        <motion.div
          key={current}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 5, ease: 'linear' }}
          className="h-full bg-cyan-400"
        />
      </div>
    </div>
  );
}
