import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../contexts/AppContext';
import { newsAPI, NewsArticle } from '../services/newsAPI';
import { NewsCard } from './NewsCard';

const PER_PAGE = 9;

export function NewsGrid() {
  const { t, isDark, selectedCategory, searchQuery } = useApp();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [visibleCount, setVisibleCount] = useState(9);
  const [showPagination, setShowPagination] = useState(false);

  // Fetch articles based on category
  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const category = selectedCategory === 'all' ? 'all' : selectedCategory;
        const response = await newsAPI.getTopHeadlines(category, 500, 1);

        if (response.success && response.data?.articles) {
          let filtered = response.data.articles;

          // Filter by search query
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
              a =>
                a.title.toLowerCase().includes(query) ||
                (a.description?.toLowerCase().includes(query) || false) ||
                a.aiSummary?.toLowerCase().includes(query) ||
                a.source.name.toLowerCase().includes(query) ||
                (a.source.domain?.toLowerCase().includes(query) || false) ||
                (a.author?.toLowerCase().includes(query) || false) ||
                a.topic.toLowerCase().includes(query) ||
                a.sentiment.type.toLowerCase().includes(query) ||
                (a.section?.toLowerCase().includes(query) || false) ||
                (a.aiTopLabel?.toLowerCase().includes(query) || false) ||
                a.keywords.some((keyword) => keyword.toLowerCase().includes(query)) ||
                a.metaTags.some((tag) => tag.toLowerCase().includes(query)) ||
                a.entities.persons.some((person) => person.toLowerCase().includes(query)) ||
                a.entities.organizations.some((organization) => organization.toLowerCase().includes(query)) ||
                a.entities.locations.some((location) => location.toLowerCase().includes(query))
            );
          }

          setArticles(filtered);
          setTotalPages(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
          setPage(1);
          setVisibleCount(PER_PAGE);
          setShowPagination(false);
        } else {
          setError(response.message || 'Failed to fetch news');
        }
      } catch (err) {
        setError('Failed to fetch news. Please check your connection.');
        console.error('Failed to fetch news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [selectedCategory, searchQuery]);

  const currentArticles = showPagination
    ? articles.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    : articles.slice(0, visibleCount);

  const canLoadMore = !showPagination && visibleCount < articles.length;

  const handleLoadMore = () => {
    const next = visibleCount + PER_PAGE;
    if (next >= articles.length) {
      setShowPagination(true);
      setPage(1);
    } else {
      setVisibleCount(next);
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
        <div className="animate-spin text-3xl mb-4">⏳</div>
        <p className="text-lg font-medium">Loading headlines...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 text-center ${isDark ? 'text-red-400' : 'text-red-500'}`}>
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-lg font-medium">Error</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 text-center ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
        <div className="text-5xl mb-4">📰</div>
        <p className="text-lg font-medium">{t.noResults}</p>
        <p className="text-sm mt-1">Try a different search or category</p>
      </div>
    );
  }

  return (
    <div>
      {/* Grid */}
      <AnimatePresence mode="wait">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {currentArticles.map((article, i) => (
            <NewsCard key={`${article.url}-${page}`} article={article} index={i} />
          ))}
        </div>
      </AnimatePresence>

      {/* Load More */}
      {canLoadMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 active:translate-y-0"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {t.loadMore}
          </button>
        </div>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mt-8 flex-wrap"
        >
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${page === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-x-0.5'} ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-gray-700 border border-gray-200 shadow-sm'}`}
          >
            <ChevronLeft size={15} />
            {t.previous}
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${p === page ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${page === totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:translate-x-0.5'} ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-gray-700 border border-gray-200 shadow-sm'}`}
          >
            {t.next}
            <ChevronRight size={15} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
