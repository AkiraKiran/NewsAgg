import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Clock3, TrendingUp } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TOPIC_BADGE_CLASS } from '../constants';
import { getArticleId, newsAPI } from '../services/newsAPI';
import type { NewsArticle } from '../types/article';
import type { SentimentType } from '../types/sentiment';

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

export function HeroCarousel() {
  const { t, isDark } = useApp();
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [headlines, setHeadlines] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const heroHeight = 500;

  useEffect(() => {
    const fetchHeadlines = async () => {
      try {
        const response = await newsAPI.getTopHeadlines('all', 10);
        if (response.success && response.data?.articles) {
          setHeadlines(response.data.articles.slice(0, 10));
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
      <div style={{ height: `${heroHeight}px` }} className={`rounded-2xl transition-all duration-300 flex items-center justify-center overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-gray-50/60 border-white/60'} border backdrop-blur-md`}>
        <div className="text-center text-gray-500">
          <div className="text-3xl mb-2">⏳</div>
          <p className="text-sm">Loading headlines...</p>
        </div>
      </div>
    );
  }

  const article = headlines[current];
  const preview = article.aiSummary || article.description || 'No summary available';
  const topicClass = TOPIC_BADGE_CLASS[article.topic];

  return (
    <div
      className="relative overflow-hidden transition-all duration-300 ease-out rounded-2xl border shadow-lg"
      style={{
        height: `${heroHeight}px`,
        overflowAnchor: 'none',
        borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(255, 255, 255, 0.6)',
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(8px)'
      }}
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent rounded-xl" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent rounded-xl" />
        </motion.div>
      </AnimatePresence>

      {/* Trending badge */}
      <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-lg">
          <TrendingUp size={10} />
          {t.topHeadlines}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`content-${current}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.7 }}
          className="absolute bottom-0 left-0 right-0 p-4 md:p-5 z-10"
        >
          <Link to={`/article/${getArticleId(article)}`} className="block group">
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <SentimentBadge sentiment={article.sentiment.type} />
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${topicClass}`}>{article.topic}</span>
              <span className="text-white/70 text-[11px] truncate">{article.source.name}</span>
            </div>
            <h2 className="font-poppins text-white text-lg md:text-xl lg:text-2xl font-bold leading-snug mb-1.5 group-hover:text-cyan-300 transition-colors line-clamp-2">
              {article.title}
            </h2>
            <p className="text-white/70 text-xs md:text-sm line-clamp-1 mb-2 max-w-2xl hidden sm:block">
              {preview}
            </p>
            <div className="flex items-center gap-3 text-white/60 text-[10px] md:text-xs flex-wrap">
              <span className="truncate">{formatDate(article.publishedAt)}</span>
              <span className="text-white/40">•</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock3 size={11} />
                {article.readability.readingTimeMin > 0 ? `${article.readability.readingTimeMin}m` : 'Quick'}
              </span>
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-9 md:h-9 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={next}
        className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-9 md:h-9 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
      >
        <ChevronRight size={16} />
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-3 right-4 flex items-center gap-1 z-10">
        {headlines.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`transition-all duration-300 rounded-full ${i === current ? 'w-5 h-1.5 bg-cyan-400' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/15 z-10 rounded-b-2xl overflow-hidden">
        <motion.div
          key={current}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 5, ease: 'linear' }}
          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
        />
      </div>
    </div>
  );
}