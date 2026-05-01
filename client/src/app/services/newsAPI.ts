import newsData from '../data/news_data_cnn.json';
import { CATEGORY_TOPIC_MAP, TOPIC_TO_CATEGORY, type Category } from '../constants';

export type NewsTopic = keyof typeof TOPIC_TO_CATEGORY;
export type NewsCategoryFilter = 'all' | Category;
export type SentimentType = 'positive' | 'neutral' | 'negative';

export const SUPPORTED_TOPICS = Object.values(CATEGORY_TOPIC_MAP) as NewsTopic[];

export interface NewsSentimentProbabilities {
  positive: number;
  neutral: number;
  negative: number;
}

export interface NewsSentiment {
  type: SentimentType;
  score: number;
  comparative: number;
  probabilities: NewsSentimentProbabilities;
  model: string;
}

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
  aiRelevance?: number;
  aiTopLabel: string | null;
  aiLabelScores: Record<string, number>;
  isPremium: boolean | null;
  isAccessibleFree: boolean | null;
  jsonldWordCount: number | null;
  og: NewsOpenGraph;
}

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

export interface SentimentDistributionItem {
  type: SentimentType;
  count: number;
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

export interface DatasetSnapshot {
  status: string;
  totalResults: number;
  articleCount: number;
  scrapedAt: string | null;
  categories: NewsTopic[];
  aiModels: Record<string, string>;
  sourceCount: number;
}

interface RawNewsData {
  status?: string;
  totalResults?: number;
  articles?: unknown[];
  scrapedAt?: string;
  categories?: unknown[];
  aiModels?: Record<string, unknown>;
}

const TOPIC_MAP: Record<NewsCategoryFilter, NewsTopic | null> = {
  all: null,
  sport: 'Sport',
  health: 'Health',
  travel: 'Travel',
  business: 'Business',
  world: 'World',
  politics: 'Politics',
  entertainment: 'Entertainment',
  science: 'Science',
};

const SENTIMENT_TYPES: SentimentType[] = ['positive', 'neutral', 'negative'];
const TOPIC_VALUES = Object.keys(TOPIC_TO_CATEGORY) as NewsTopic[];

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));
const clampSignedUnit = (value: number): number => Math.max(-1, Math.min(1, value));

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const asBoolean = (value: unknown): boolean | null => (
  typeof value === 'boolean' ? value : null
);

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(asString)
    .filter((item): item is string => item !== null);
};

const asNumberRecord = (value: unknown): Record<string, number> => {
  const raw = asRecord(value);
  return Object.fromEntries(
    Object.entries(raw)
      .map(([key, item]) => [key, asNumber(item)])
      .filter((entry): entry is [string, number] => entry[1] !== null)
  );
};

const pickString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const parsed = asString(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const pickNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = asNumber(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const pickBoolean = (...values: unknown[]): boolean | null => {
  for (const value of values) {
    const parsed = asBoolean(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const normalizeCategory = (category: string): NewsCategoryFilter => {
  const normalized = category.trim().toLowerCase();

  if (!normalized || normalized === 'all' || normalized === 'general') {
    return 'all';
  }

  if (normalized === 'sports') {
    return 'sport';
  }

  if (normalized in CATEGORY_TOPIC_MAP) {
    return normalized as Category;
  }

  const matchingCategory = Object.entries(CATEGORY_TOPIC_MAP).find(([, topic]) => topic.toLowerCase() === normalized);
  return matchingCategory ? (matchingCategory[0] as Category) : 'all';
};

const normalizeTopic = (topic: unknown): NewsTopic | null => {
  const rawTopic = asString(topic);
  if (!rawTopic) {
    return null;
  }

  return TOPIC_VALUES.find((value) => value.toLowerCase() === rawTopic.toLowerCase()) ?? null;
};

const normalizeSentiment = (value: unknown): NewsSentiment => {
  const raw = asRecord(value);
  const rawType = pickString(raw.type)?.toLowerCase() ?? 'neutral';
  const type: SentimentType = SENTIMENT_TYPES.includes(rawType as SentimentType)
    ? (rawType as SentimentType)
    : 'neutral';

  const score = clampUnit(pickNumber(raw.score) ?? 0);
  const comparative = clampSignedUnit(pickNumber(raw.comparative) ?? 0);

  const rawProbabilities = asRecord(raw.probabilities);
  let probabilities: NewsSentimentProbabilities = {
    positive: clampUnit(pickNumber(rawProbabilities.positive) ?? 0),
    neutral: clampUnit(pickNumber(rawProbabilities.neutral) ?? 0),
    negative: clampUnit(pickNumber(rawProbabilities.negative) ?? 0),
  };

  const total = probabilities.positive + probabilities.neutral + probabilities.negative;

  if (total > 0) {
    probabilities = {
      positive: probabilities.positive / total,
      neutral: probabilities.neutral / total,
      negative: probabilities.negative / total,
    };
  } else if (type === 'positive') {
    probabilities = { positive: score, neutral: 1 - score, negative: 0 };
  } else if (type === 'negative') {
    probabilities = { positive: 0, neutral: 1 - score, negative: score };
  } else {
    const split = (1 - score) / 2;
    probabilities = { positive: split, neutral: score, negative: split };
  }

  return {
    type,
    score,
    comparative,
    probabilities,
    model: pickString(raw.model) ?? 'general',
  };
};

const normalizeSource = (value: unknown): NewsSource => {
  const raw = asRecord(value);
  return {
    id: pickString(raw.id),
    name: pickString(raw.name) ?? 'Unknown Source',
    domain: pickString(raw.domain),
    country: pickString(raw.country),
    language: pickString(raw.language),
    logo: pickString(raw.logo, raw.logo_url),
  };
};

const normalizeImages = (value: unknown): NewsImage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const raw = asRecord(item);
      const url = pickString(raw.url);
      if (!url) {
        return null;
      }

      return {
        url,
        alt: pickString(raw.alt),
        caption: pickString(raw.caption),
        isPrimary: pickBoolean(raw.is_primary, raw.isPrimary) ?? false,
      };
    })
    .filter((item): item is NewsImage => item !== null);
};

const normalizeEntities = (value: unknown): NewsEntities => {
  const raw = asRecord(value);
  return {
    persons: asStringArray(raw.persons),
    organizations: asStringArray(raw.organizations),
    locations: asStringArray(raw.locations),
    misc: asStringArray(raw.misc),
  };
};

const normalizeToxicity = (value: unknown): NewsToxicity => {
  const raw = asRecord(value);
  return {
    label: pickString(raw.label) ?? 'unknown',
    score: clampUnit(pickNumber(raw.score) ?? 0),
  };
};

const normalizeReadability = (value: unknown): NewsReadability => {
  const raw = asRecord(value);
  return {
    wordCount: Math.max(0, Math.round(pickNumber(raw.word_count, raw.wordCount) ?? 0)),
    readingTimeMin: Math.max(0, Math.round(pickNumber(raw.reading_time_min, raw.readingTimeMin) ?? 0)),
    fleschScore: pickNumber(raw.flesch_score, raw.fleschScore) ?? 0,
    fleschKincaid: pickNumber(raw.flesch_kincaid, raw.fleschKincaid) ?? 0,
    smogIndex: pickNumber(raw.smog_index, raw.smogIndex) ?? 0,
  };
};

const normalizeOpenGraph = (value: unknown): NewsOpenGraph => {
  const raw = asRecord(value);
  return {
    title: pickString(raw.title),
    description: pickString(raw.description),
    siteName: pickString(raw.site_name, raw.siteName),
    locale: pickString(raw.locale),
    twitterCard: pickString(raw.twitter_card, raw.twitterCard),
    twitterSite: pickString(raw.twitter_site, raw.twitterSite),
  };
};

const normalizeArticle = (article: unknown): NewsArticle | null => {
  const raw = asRecord(article);
  const topic = normalizeTopic(raw.topic);

  if (!topic) {
    return null;
  }

  const source = normalizeSource(raw.source);
  const canonicalUrl = pickString(raw.canonical_url, raw.canonicalUrl);
  const url = pickString(raw.url, canonicalUrl) ?? '';
  const publishedAt = pickString(raw.published_at, raw.publishedAt) ?? new Date(0).toISOString();
  const fallbackId = (canonicalUrl ?? url) || `${topic}-${publishedAt}`;

  return {
    id: pickString(raw.id) ?? encodeURIComponent(fallbackId),
    canonicalUrl,
    source,
    author: pickString(raw.author),
    authorUrl: pickString(raw.author_url, raw.authorUrl),
    title: pickString(raw.title) ?? 'Untitled',
    description: pickString(raw.description),
    url,
    publishedAt,
    modifiedAt: pickString(raw.modified_at, raw.modifiedAt),
    scrapedAt: pickString(raw.scraped_at, raw.scrapedAt),
    content: pickString(raw.content),
    aiSummary: pickString(raw.ai_summary, raw.aiSummary),
    urlToImage: pickString(raw.url_to_image, raw.urlToImage),
    images: normalizeImages(raw.images),
    videoUrl: pickString(raw.video_url, raw.videoUrl),
    sentiment: normalizeSentiment(raw.sentiment),
    toxicity: normalizeToxicity(raw.toxicity),
    topic,
    section: pickString(raw.section),
    metaTags: asStringArray(raw.meta_tags ?? raw.metaTags),
    ogType: pickString(raw.og_type, raw.ogType),
    language: pickString(raw.language, source.language),
    keywords: asStringArray(raw.keywords),
    entities: normalizeEntities(raw.entities),
    readability: normalizeReadability(raw.readability),
    relatedUrls: asStringArray(raw.related_urls ?? raw.relatedUrls),
    aiRelevance: pickNumber(raw.ai_relevance, raw.aiRelevance) ?? undefined,
    aiTopLabel: pickString(raw.ai_top_label, raw.aiTopLabel),
    aiLabelScores: asNumberRecord(raw.ai_label_scores ?? raw.aiLabelScores),
    isPremium: pickBoolean(raw.is_premium, raw.isPremium),
    isAccessibleFree: pickBoolean(raw.is_accessible_free, raw.isAccessibleFree),
    jsonldWordCount: pickNumber(raw.jsonld_word_count, raw.jsonldWordCount),
    og: normalizeOpenGraph(raw.og),
  };
};

const stableHash = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const parsedNewsData = newsData as RawNewsData;
const rawAiModels = asRecord(parsedNewsData.aiModels);

const normalizedArticles = (parsedNewsData.articles ?? [])
  .map(normalizeArticle)
  .filter((article): article is NewsArticle => article !== null)
  .sort((left, right) => {
    const publishedDiff = new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
    if (publishedDiff !== 0) {
      return publishedDiff;
    }
    return (right.aiRelevance ?? 0) - (left.aiRelevance ?? 0);
  });

const datasetCategories = asStringArray(parsedNewsData.categories)
  .map(normalizeTopic)
  .filter((topic): topic is NewsTopic => topic !== null);

const datasetSnapshot: DatasetSnapshot = {
  status: parsedNewsData.status ?? 'ok',
  totalResults: typeof parsedNewsData.totalResults === 'number'
    ? parsedNewsData.totalResults
    : normalizedArticles.length,
  articleCount: normalizedArticles.length,
  scrapedAt: pickString(parsedNewsData.scrapedAt),
  categories: datasetCategories.length > 0 ? datasetCategories : [...SUPPORTED_TOPICS],
  aiModels: Object.fromEntries(
    Object.entries(rawAiModels).map(([key, value]) => [key, pickString(value) ?? String(value)])
  ),
  sourceCount: new Set(normalizedArticles.map((article) => article.source.id ?? article.source.name)).size,
};

const newsStatus = datasetSnapshot.status;

const paginateArticles = (articles: NewsArticle[], pageSize: number, page: number): NewsArticle[] => {
  const safePageSize = pageSize > 0 ? pageSize : 20;
  const safePage = page > 0 ? page : 1;
  const startIndex = (safePage - 1) * safePageSize;
  return articles.slice(startIndex, startIndex + safePageSize);
};

const filterByCategory = (articles: NewsArticle[], category: string): NewsArticle[] => {
  const normalizedCategory = normalizeCategory(category);
  const expectedTopic = TOPIC_MAP[normalizedCategory];
  if (!expectedTopic) {
    return articles;
  }
  return articles.filter((article) => article.topic === expectedTopic);
};

const filterBySourceCountry = (articles: NewsArticle[], countryCode: string): NewsArticle[] => {
  const normalizedCode = countryCode.trim().toUpperCase();
  if (!normalizedCode) {
    return articles;
  }
  return articles.filter((article) => article.source.country?.toUpperCase() === normalizedCode);
};

const buildSuccessResponse = (
  articles: NewsArticle[],
  message: string,
  pageSize: number,
  page: number
): ServerResponse => ({
  status: 200,
  success: true,
  message,
  data: {
    status: newsStatus,
    totalResults: articles.length,
    articles: paginateArticles(articles, pageSize, page),
  },
});

const buildFailureResponse = (message: string, error: unknown): ServerResponse => ({
  status: 500,
  success: false,
  message,
  error: error instanceof Error ? error.message : 'Unknown error',
});

export const getAllArticles = (category: NewsCategoryFilter = 'all'): NewsArticle[] => (
  [...filterByCategory(normalizedArticles, category)]
);

export const getDatasetSnapshot = (): DatasetSnapshot => ({ ...datasetSnapshot });

export const getArticleId = (article: Pick<NewsArticle, 'id' | 'url' | 'title'>): string => (
  article.id || encodeURIComponent(article.url || article.title)
);

export const getArticleById = (articleId: string): NewsArticle | null => {
  const directMatch = normalizedArticles.find((article) => article.id === articleId);
  if (directMatch) {
    return directMatch;
  }

  try {
    const decoded = decodeURIComponent(articleId);
    return normalizedArticles.find((article) => article.url === decoded || article.title === decoded) ?? null;
  } catch {
    return null;
  }
};

export const getSentimentDistribution = (category: NewsCategoryFilter = 'all'): SentimentDistributionItem[] => {
  const counts: Record<SentimentType, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  filterByCategory(normalizedArticles, category).forEach((article) => {
    counts[article.sentiment.type] += 1;
  });

  return SENTIMENT_TYPES.map((type) => ({
    type,
    count: counts[type],
  }));
};

export const getLatestArticles = (limit = 6, category: NewsCategoryFilter = 'all'): NewsArticle[] => (
  filterByCategory(normalizedArticles, category).slice(0, Math.max(0, limit))
);

export const getTrendingKeywords = (limit = 10, category: NewsCategoryFilter = 'all'): TrendingKeyword[] => {
  const keywordMap = new Map<string, number>();

  filterByCategory(normalizedArticles, category).forEach((article) => {
    article.keywords.forEach((keyword) => {
      const normalizedKeyword = keyword.toLowerCase();
      keywordMap.set(normalizedKeyword, (keywordMap.get(normalizedKeyword) ?? 0) + 1);
    });

    article.metaTags.forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      keywordMap.set(normalizedTag, (keywordMap.get(normalizedTag) ?? 0) + 1);
    });
  });

  return [...keywordMap.entries()]
    .sort((left, right) => {
      if (right[1] === left[1]) {
        return left[0].localeCompare(right[0]);
      }
      return right[1] - left[1];
    })
    .slice(0, Math.max(0, limit))
    .map(([keyword, count]) => ({ keyword, count }));
};

export const getLiveEngagement = (
  timestamp = Date.now(),
  limit = 8,
  category: NewsCategoryFilter = 'all'
): LiveEngagementItem[] => {
  const tick = timestamp / 10000;

  return filterByCategory(normalizedArticles, category)
    .map((article) => {
      const seed = stableHash(article.id || article.title);
      const baseViews = 1200 + (seed % 8500);
      const baseLikes = 220 + (seed % 2200);
      const baseInteractions = 480 + (seed % 3400);
      const phase = tick + (seed % 37);

      return {
        articleId: getArticleId(article),
        title: article.title,
        topic: article.topic,
        sentiment: article.sentiment.type,
        publishedAt: article.publishedAt,
        views: Math.max(0, Math.round(baseViews + Math.sin(phase) * 280)),
        likes: Math.max(0, Math.round(baseLikes + Math.cos(phase * 1.1) * 95)),
        interactions: Math.max(0, Math.round(baseInteractions + Math.sin(phase * 0.9) * 140)),
      };
    })
    .sort((left, right) => right.interactions - left.interactions)
    .slice(0, Math.max(0, limit));
};

export const newsAPI = {
  getAllNews: async (pageSize = 40, page = 1): Promise<ServerResponse> => {
    try {
      return buildSuccessResponse(normalizedArticles, 'Articles fetched successfully', pageSize, page);
    } catch (error) {
      return buildFailureResponse('Failed to fetch articles', error);
    }
  },

  getTopHeadlines: async (
    category = 'all',
    pageSize = 80,
    page = 1
  ): Promise<ServerResponse> => {
    try {
      const articles = filterByCategory(normalizedArticles, category);
      return buildSuccessResponse(articles, 'Top headlines fetched successfully', pageSize, page);
    } catch (error) {
      return buildFailureResponse('Failed to fetch headlines', error);
    }
  },

  getCountryHeadlines: async (
    countryCode: string,
    pageSize = 80,
    page = 1
  ): Promise<ServerResponse> => {
    try {
      const articles = filterBySourceCountry(normalizedArticles, countryCode);
      return buildSuccessResponse(articles, 'Country headlines fetched successfully', pageSize, page);
    } catch (error) {
      return buildFailureResponse('Failed to fetch country headlines', error);
    }
  },
};
