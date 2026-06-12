import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Newspaper } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TOPIC_TO_CATEGORY } from '../constants';
import { ArticleHeader } from '../components/article/ArticleHeader';
import { ArticleBody } from '../components/article/ArticleBody';
import { ArticleFooter } from '../components/article/ArticleFooter';
import { ArticleSidebar } from '../components/article/ArticleSidebar';
import { ArticleChat } from '../components/article/ArticleChat';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { useTranslate } from '../hooks/useTranslate';
import { useArticle } from '../hooks/useArticle';
import { useStatsOverview, useTrendingStats } from '../hooks/useStats';
import { useLatestArticles } from '../hooks/useArticles';
import { mutedTextClass, panelBaseClass } from '../components/article/helpers';
import { buildLiveEngagement } from '../services/newsAPI';
import type { NewsArticle, NewsCategoryFilter } from '../types/article';
import type { SentimentDistributionItem } from '../types/sentiment';

export function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, isDark } = useApp();

  // ── Article via React Query (GET /api/articles/:id, legacy-store fallback) ─
  const { data, isLoading: loading, isError } = useArticle(id);
  const article: NewsArticle | null = data ?? null;
  const error = !id
    ? 'Article reference is missing.'
    : isError || (!loading && !article)
      ? 'Article not found in the current dataset.'
      : null;

  const [tick, setTick] = useState(Date.now());

  const handleBackToHome = () => {
    const historyIndex = window.history.state?.idx ?? 0;
    if (historyIndex > 0) { navigate(-1); return; }
    navigate('/');
  };

  // ── Derive category once article is loaded ────────────────────────────────
  const articleCategory: NewsCategoryFilter = article ? TOPIC_TO_CATEGORY[article.topic] : 'all';

  // ── Sidebar data: the SAME data layer as the main page (stats endpoints +
  // cheap paginated articles, shared React Query cache) — no legacy store. ──
  const { data: overview } = useStatsOverview(articleCategory);
  const { data: trendingKeywords } = useTrendingStats(8, articleCategory);
  const { data: latestPage } = useLatestArticles({ limit: 12, category: articleCategory });

  const categoryArticles = useMemo(() => latestPage?.articles ?? [], [latestPage]);
  const categorySentimentDistribution = useMemo<SentimentDistributionItem[]>(
    () =>
      overview
        ? [
            { type: 'positive', count: overview.sentiments.positive },
            { type: 'neutral', count: overview.sentiments.neutral },
            { type: 'negative', count: overview.sentiments.negative },
          ]
        : [],
    [overview]
  );
  const categoryLiveEngagement = useMemo(
    () => buildLiveEngagement(categoryArticles, tick, 6),
    [categoryArticles, tick]
  );

  // ── Tick timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 12_000);
    return () => window.clearInterval(id);
  }, []);

  // ── Translate (cache-first via backend; no-op unless translateMode is on) ──
  const tr = useTranslate(article);

  const panelBase = panelBaseClass(isDark);
  const mutedText = mutedTextClass(isDark);

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
        <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
          <div
            className={`w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4 ${isDark ? 'border-cyan-400/70' : 'border-cyan-500/70'}`}
            aria-label={t.loading}
          />
          <p className="text-lg font-medium">{t.loading || 'Loading article...'}</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <button type="button" onClick={handleBackToHome} className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}>
            <ArrowLeft size={16} />{t.backToHome}
          </button>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`text-center py-20 rounded-2xl border ${panelBase}`}>
          <Newspaper size={56} className={`mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Article Not Found</h2>
          <p className={`mb-6 ${mutedText}`}>{error}</p>
          <Link to="/" className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all">
            Go to Homepage
          </Link>
        </motion.div>
      </div>
    );
  }

  // Apply translated text fields (when active) over the original article.
  // Metrics/sidebar/chat keep the original article for accuracy.
  const displayArticle: NewsArticle = {
    ...article,
    title: tr.title,
    description: tr.description,
    content: tr.content,
    aiSummary: tr.aiSummary,
  };

  // Sidebar content extracted to avoid duplication between desktop and mobile
  const sidebar = (
    <ArticleSidebar
      article={article}
      isDark={isDark}
      t={t}
      categorySentimentDistribution={categorySentimentDistribution}
      categoryArticles={categoryArticles}
      categoryTrendingKeywords={trendingKeywords ?? []}
      categoryLiveEngagement={categoryLiveEngagement}
    />
  );

  return (
    <div className="px-4 md:px-6 py-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-5">
        <button type="button" onClick={handleBackToHome} className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}>
          <ArrowLeft size={16} />{t.backToHome}
        </button>
      </motion.div>

      <div className="lg:flex gap-6">
        {/* Article content — exactly the Home centre column: uncapped, takes
            whatever the right rail (max 560px) leaves over. */}
        <div className="flex-1 min-w-0 pb-10">
          <div className="mb-5">
            <LanguageSwitcher isDark={isDark} isLoading={tr.isLoading} isAutoTranslated={tr.isAutoTranslated} />
          </div>
          <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="min-w-0">
            <ArticleHeader article={displayArticle} isDark={isDark} />
            <ArticleBody article={displayArticle} isDark={isDark} />
            <ArticleFooter article={article} isDark={isDark} />
          </motion.article>
        </div>

        {/* Sidebar — desktop: grows to the right edge like the Home rail */}
        <div className="hidden lg:block flex-1 min-w-[300px] max-w-[560px]">
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pb-6 pr-1"
            style={{ scrollbarWidth: 'thin' }}
          >
            {sidebar}
          </motion.aside>
        </div>
      </div>

      {/* Sidebar — mobile */}
      <div className="lg:hidden py-8">
        <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          {sidebar}
        </motion.aside>
      </div>

      {/* AI chat (Groq via backend proxy) */}
      <ArticleChat article={article} isDark={isDark} />
    </div>
  );
}
