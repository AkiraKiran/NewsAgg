import { TOPIC_TO_CATEGORY, type Category } from '../constants';
import type { NewsSentiment, SentimentType } from './sentiment';

export type NewsTopic = keyof typeof TOPIC_TO_CATEGORY;
export type NewsCategoryFilter = 'all' | Category;

export interface NewsEntities {
  persons: string[];
  organizations: string[];
  locations: string[];
  misc: string[];
}

export interface NewsSource {
  id: string | null;
  name: string;
  domain: string | null;
  country: string | null;
  language: string | null;
  logo: string | null;
}

export interface NewsImage {
  url: string;
  alt: string | null;
  caption: string | null;
  isPrimary: boolean;
}

export interface NewsToxicity {
  label: string;
  score: number;
}

export interface NewsReadability {
  wordCount: number;
  readingTimeMin: number;
  fleschScore: number;
  fleschKincaid: number;
  smogIndex: number;
}

export interface NewsOpenGraph {
  title: string | null;
  description: string | null;
  siteName: string | null;
  locale: string | null;
  twitterCard: string | null;
  twitterSite: string | null;
}

export interface NewsArticle {
  id: string;
  canonicalUrl: string | null;
  source: NewsSource;
  author: string | null;
  authorUrl: string | null;
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  modifiedAt: string | null;
  scrapedAt: string | null;
  content: string | null;
  aiSummary: string | null;
  urlToImage: string | null;
  images: NewsImage[];
  videoUrl: string | null;
  sentiment: NewsSentiment;
  toxicity: NewsToxicity;
  topic: NewsTopic;
  section: string | null;
  metaTags: string[];
  ogType: string | null;
  language: string | null;
  keywords: string[];
  entities: NewsEntities;
  readability: NewsReadability;
  relatedUrls: string[];
  aiConfidence?: number;
  aiTopLabel: string | null;
  aiLabelScores: Record<string, number>;
  isPremium: boolean | null;
  isAccessibleFree: boolean | null;
  jsonldWordCount: number | null;
  og: NewsOpenGraph;
}

export interface TrendingKeyword {
  keyword: string;
  count: number;
}

export interface LiveEngagementItem {
  articleId: string;
  title: string;
  topic: NewsTopic;
  sentiment: SentimentType;
  publishedAt: string;
  views: number;
  likes: number;
  interactions: number;
}
