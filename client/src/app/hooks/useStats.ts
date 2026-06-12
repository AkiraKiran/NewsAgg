import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../lib/apiFetch';

// Hooks over the aggregate /api/stats/* and /api/markets/* endpoints — the
// widgets read counters straight from SQL instead of downloading the whole
// article dataset.

export interface StatsOverview {
  total: number;
  sentiments: { positive: number; neutral: number; negative: number };
  sourceCount: number;
  keywordCount: number;
  scrapedAt: string | null;
  categories: string[];
  aiModels: Record<string, string>;
}

export interface TrendingStat {
  keyword: string;
  count: number;
}

export interface TrendPoint {
  day: string;
  articles: number;
  avgPolarity: number;
}

export interface MarketsSummary {
  fx: { base: 'USD'; idr: number; twd: number; eur: number; updatedAt: string | null; stale: boolean } | null;
  indices: { items: Array<{ symbol: string; name: string; close: number; changePct: number | null; spark: number[] }>; stale: boolean } | null;
  crypto: { items: Array<{ id: string; symbol: string; price: number; changePct24h: number | null; spark: number[] }>; stale: boolean } | null;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json?.success) throw new Error('Request failed');
  return json.data as T;
}

export function useStatsOverview(category: string = 'all') {
  return useQuery({
    queryKey: ['stats', 'overview', category],
    queryFn: () =>
      getJson<StatsOverview>(`/api/stats/overview?category=${encodeURIComponent(category)}`),
  });
}

export function useTrendingStats(limit = 10, category: string = 'all') {
  return useQuery({
    queryKey: ['stats', 'trending', category, limit],
    queryFn: () =>
      getJson<TrendingStat[]>(
        `/api/stats/trending?limit=${limit}&category=${encodeURIComponent(category)}`
      ),
  });
}

export function useBusinessTrend(days = 14) {
  return useQuery({
    queryKey: ['stats', 'business-trend', days],
    queryFn: () => getJson<TrendPoint[]>(`/api/stats/business-trend?days=${days}`),
  });
}

export function useMarkets() {
  return useQuery({
    queryKey: ['markets', 'summary'],
    queryFn: () => getJson<MarketsSummary>('/api/markets/summary'),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
