import { useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useArticles } from '../hooks/useArticles';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { NewsCard } from './NewsCard';
import { HeroCarousel } from './HeroCarousel';

export function NewsGrid() {
  const { t, isDark, selectedCategory, selectedSources, selectedSentiment, searchQuery } = useApp();
  const debouncedQuery = useDebouncedValue(searchQuery.trim(), 250);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // All filtering happens server-side now (category/source/sentiment/q),
  // 20 summary rows per page instead of the legacy 400-article payload.
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useArticles({
    category: selectedCategory,
    sources: selectedSources,
    sentiment: selectedSentiment,
    q: debouncedQuery,
    pageSize: 20,
  });

  const articles = data?.pages.flatMap((page) => page.articles) ?? [];

  // Infinite scroll: pull the next page when the sentinel becomes visible.
  useEffect(() => {
    if (!hasNextPage) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, articles.length]);

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
        <div className="animate-spin text-3xl mb-4">⏳</div>
        <p className="text-lg font-medium">{t.loading}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 text-center ${isDark ? 'text-red-400' : 'text-red-500'}`}>
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-lg font-medium">{t.errorTitle}</p>
        <p className="text-sm mt-1">{t.fetchFailed}</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 text-center ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
        <div className="text-5xl mb-4">📰</div>
        <p className="text-lg font-medium">{t.noResults}</p>
        <p className="text-sm mt-1">{t.tryDifferent}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden">
      {/* Hero Carousel — hidden while searching (raw query so it reacts on the
          first keystroke; results are about the search, not top headlines). */}
      {searchQuery.trim().length === 0 && (
        <div className="mb-8 overflow-hidden">
          <HeroCarousel />
        </div>
      )}

      {/* Feed: single column in the X-style centre; two columns once the
          full-bleed centre grows past ~900px (viewport ≥1600px). */}
      <div className="grid grid-cols-1 min-[1600px]:grid-cols-2 gap-5 overflow-x-hidden">
        {articles.map((article, i) => (
          <NewsCard key={article.id || article.url} article={article} index={i} />
        ))}
      </div>

      {/* Infinite-scroll sentinel + loading indicator */}
      {hasNextPage && (
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
