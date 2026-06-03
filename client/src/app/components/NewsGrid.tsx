import { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { matchSourceId } from '../constants';
import { newsAPI } from '../services/newsAPI';
import type { NewsArticle } from '../types/article';
import { NewsCard } from './NewsCard';
import { HeroCarousel } from './HeroCarousel';

const PER_PAGE = 9;

export function NewsGrid() {
  const { t, isDark, selectedCategory, selectedSources, selectedSentiment, searchQuery } = useApp();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

          // Filter by selected sources (multi-select; empty = all sources)
          if (selectedSources.length > 0) {
            filtered = filtered.filter((a) => {
              const sourceId = matchSourceId(a.source);
              return sourceId !== null && selectedSources.includes(sourceId);
            });
          }

          // Filter by sentiment (positive | neutral | negative; 'all' = no filter)
          if (selectedSentiment !== 'all') {
            filtered = filtered.filter((a) => a.sentiment.type === selectedSentiment);
          }

          setArticles(filtered);
          setVisibleCount(PER_PAGE);
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
  }, [selectedCategory, selectedSources, selectedSentiment, searchQuery]);

  const currentArticles = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  // Infinite scroll: reveal the next batch when the sentinel scrolls into view.
  // Re-running on visibleCount keeps loading while the sentinel stays visible
  // (e.g. tall viewports) until everything is shown. rootMargin pre-loads early.
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PER_PAGE, articles.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, articles.length, visibleCount]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
        <div className="animate-spin text-3xl mb-4">⏳</div>
        <p className="text-lg font-medium">{t.loading}</p>
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
    <div className="w-full overflow-x-hidden">
      {/* Hero Carousel */}
      <div className="mb-8 overflow-hidden">
        <HeroCarousel />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-x-hidden">
        {currentArticles.map((article, i) => (
          <NewsCard key={article.url} article={article} index={i} />
        ))}
      </div>

      {/* Infinite-scroll sentinel + loading indicator */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-10">
          <div
            className={`w-6 h-6 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-slate-600' : 'border-gray-300'}`}
            aria-label={t.loading}
          />
        </div>
      )}
    </div>
  );
}
