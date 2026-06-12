import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  fetchArticlesPage,
  type ArticlesPage,
  type ArticlesPageParams,
} from '../services/newsAPI';
import type { SentimentType } from '../types/sentiment';

/** Infinite paginated feed with server-side category/source/sentiment/search
 * filtering. The flat list lives in data.pages[].articles. */
export function useArticles(params: ArticlesPageParams) {
  const key = {
    category: params.category ?? 'all',
    sources: [...(params.sources ?? [])].sort(),
    sentiment: params.sentiment ?? 'all',
    q: params.q ?? '',
    sort: params.sort ?? 'latest',
    pageSize: params.pageSize ?? 20,
  };
  return useInfiniteQuery({
    queryKey: ['articles', key],
    queryFn: ({ pageParam }) => fetchArticlesPage(params, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last: ArticlesPage) =>
      last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined,
  });
}

/** Single page of newest articles for rail widgets (Live View / Engagement).
 * Cheap summary rows via the paginated endpoint — never the legacy store. */
export function useLatestArticles({ limit = 8, category }: { limit?: number; category?: string } = {}) {
  return useQuery({
    queryKey: ['latest', { limit, category: category ?? 'all' }],
    queryFn: () => fetchArticlesPage({ category, pageSize: limit }, 1),
    placeholderData: (prev) => prev,
  });
}

export interface RankedHeadlinesParams {
  limit?: number;
  category?: string;
  sources?: string[];
  sentiment?: SentimentType | 'all' | '';
}

/** Single page of importance-ranked headlines (server-side `sort=rank`),
 * filter-aware: respects category/source/sentiment like the main feed. */
export function useRankedHeadlines({
  limit = 10,
  category,
  sources,
  sentiment,
}: RankedHeadlinesParams = {}) {
  const key = {
    limit,
    category: category ?? 'all',
    sources: [...(sources ?? [])].sort(),
    sentiment: sentiment ?? 'all',
  };
  return useQuery({
    queryKey: ['headlines', key],
    queryFn: () =>
      fetchArticlesPage({ sort: 'rank', pageSize: limit, category, sources, sentiment }, 1),
    // Keep the previous filter's slides visible while the new set loads.
    placeholderData: (prev) => prev,
  });
}
