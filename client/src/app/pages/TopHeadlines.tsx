import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { NewsCard } from '../components/NewsCard';
import { SentimentPanel } from '../components/SentimentPanel';
import { newsAPI, NewsArticle } from '../services/newsAPI';

export function TopHeadlines() {
  const { t, isDark } = useApp();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHeadlines = async () => {
      try {
        setLoading(true);
        const response = await newsAPI.getTopHeadlines('all', 80, 1);
        if (response.success && response.data?.articles) {
          setArticles(response.data.articles);
        } else {
          setError(response.message || 'Failed to fetch headlines');
        }
      } catch (err) {
        setError('Failed to fetch headlines. Please try again later.');
        console.error('Failed to fetch headlines:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeadlines();
  }, []);

  if (loading) {
    return (
      <div className={`px-4 md:px-6 py-6 max-w-[1600px] mx-auto`}>
        <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
          <div className="animate-spin text-3xl mb-4">⏳</div>
          <p className="text-lg font-medium">{t.loading || 'Loading headlines...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`px-4 md:px-6 py-6 max-w-[1600px] mx-auto`}>
        <div className={`flex flex-col items-center justify-center py-20 text-center ${isDark ? 'text-red-400' : 'text-red-500'}`}>
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-lg font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <h1 className={`font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
            {t.topHeadlines}
          </h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Today's most important stories</p>
        </div>
      </motion.div>

      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {articles.map((article, i) => (
              <NewsCard key={article.url} article={article} index={i} />
            ))}
          </div>
        </div>
        <div className="hidden lg:block w-72 xl:w-80 shrink-0">
          <div className="sticky top-[calc(4rem+6px)]">
            <SentimentPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
