import type { NewsArticle, NewsTopic } from './article';

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export interface ServerResponse {
  status: number;
  success: boolean;
  message: string;
  data?: NewsApiResponse;
  error?: string;
}

export interface DatasetSnapshot {
  status: string;
  totalResults: number;
  articleCount: number;
  scrapedAt: string | null;
  categories: NewsTopic[];
  aiModels: Record<string, string>;
  sourceCount: number;
}

export interface RawNewsData {
  status?: string;
  totalResults?: number;
  articles?: unknown[];
  scrapedAt?: string;
  categories?: unknown[];
  aiModels?: Record<string, unknown>;
}

export interface NormalizedStore {
  articles: NewsArticle[];
  snapshot: DatasetSnapshot;
  status: string;
}

export interface DailyQuote {
  quote: string;
  author: string;
}
