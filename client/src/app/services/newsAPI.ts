import { CATEGORY_TOPIC_MAP, TOPIC_TO_CATEGORY, type Category } from '../constants';
import type {
  NewsTopic,
  NewsCategoryFilter,
  NewsEntities,
  NewsSource,
  NewsImage,
  NewsToxicity,
  NewsReadability,
  NewsOpenGraph,
  NewsArticle,
  TrendingKeyword,
  LiveEngagementItem,
} from '../types/article';
import type {
  SentimentType,
  NewsSentimentProbabilities,
  NewsSentiment,
  SentimentDistributionItem,
} from '../types/sentiment';
import type {
  ServerResponse,
  DatasetSnapshot,
  RawNewsData,
  NormalizedStore,
  DailyQuote,
} from '../types/api';

export const SUPPORTED_TOPICS = Object.values(CATEGORY_TOPIC_MAP) as NewsTopic[];

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_BASE_URL = `${BASE_URL}/api/news-from-db`;
const STORE_CACHE_TTL_MS = 30_000;

// ─── Internal maps ────────────────────────────────────────────────────────────

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
const KEYWORD_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'have',
  'has',
  'was',
  'were',
  'will',
  'would',
  'about',
  'into',
  'after',
  'before',
  'over',
  'under',
  'more',
  'most',
  'just',
  'than',
  'also',
  'news',
  'read',
  'watch',
  'video',
  'update',
  'latest',
]);
const KEYWORD_NOISE_WORDS = new Set([
  'cnn',
  'bbc',
  'aljazeera',
  'breaking',
  'live',
  'story',
  'report',
  'privacy',
  'cookie',
  'terms',
  'source',
  'article',
]);

// ─── Primitive helpers (unchanged) ───────────────────────────────────────────

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));
const clampSignedUnit = (value: number): number => Math.max(-1, Math.min(1, value));

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter((item): item is string => item !== null);
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
    if (parsed !== null) return parsed;
  }
  return null;
};

const pickNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = asNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const pickBoolean = (...values: unknown[]): boolean | null => {
  for (const value of values) {
    const parsed = asBoolean(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

// ─── Normalizers (unchanged) ─────────────────────────────────────────────────

const normalizeCategory = (category: string): NewsCategoryFilter => {
  const normalized = category.trim().toLowerCase();
  if (!normalized || normalized === 'all' || normalized === 'general') return 'all';
  if (normalized === 'sports') return 'sport';
  if (normalized in CATEGORY_TOPIC_MAP) return normalized as Category;
  const matchingCategory = Object.entries(CATEGORY_TOPIC_MAP).find(
    ([, topic]) => topic.toLowerCase() === normalized
  );
  return matchingCategory ? (matchingCategory[0] as Category) : 'all';
};

const normalizeTopic = (topic: unknown): NewsTopic | null => {
  const rawTopic = asString(topic);
  if (!rawTopic) return null;
  return TOPIC_VALUES.find((value) => value.toLowerCase() === rawTopic.toLowerCase()) ?? null;
};

const normalizeKeywordToken = (value: string): string | null => {
  const trimmed = value.trim().toLowerCase().replace(/^#/, '');
  if (!trimmed) return null;
  if (trimmed.includes('http://') || trimmed.includes('https://')) return null;
  const cleaned = trimmed.replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length < 4) return null;
  if (/^\d+$/.test(cleaned)) return null;
  if (KEYWORD_STOP_WORDS.has(cleaned) || KEYWORD_NOISE_WORDS.has(cleaned)) return null;
  return cleaned;
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
  return { type, score, comparative, probabilities, model: pickString(raw.model) ?? 'general' };
};

const normalizeSource = (value: unknown): NewsSource => {
  const raw = asRecord(value);
  return {
    // 确保有 ID，如果没有就给个预设值避免报错
    id: pickString(raw.id, raw.source_id) ?? 'unknown',
    // 优先拿 name，若无则拿 DB join 来的 source_name
    name: pickString(raw.name, raw.source_name, raw.id, raw.source_id) ?? 'Unknown Source',
    domain: pickString(raw.domain, raw.source_domain),
    country: pickString(raw.country, raw.source_country),
    // 语言给一个默认值 en
    language: pickString(raw.language, raw.source_language) ?? 'en',
    logo: pickString(raw.logo, raw.logo_url, raw.source_logo),
  };
};

const normalizeImages = (value: unknown): NewsImage[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const raw = asRecord(item);
      const url = pickString(raw.url);
      if (!url) return null;
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
  return { label: pickString(raw.label) ?? 'unknown', score: clampUnit(pickNumber(raw.score) ?? 0) };
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

  // 1. 处理 Topic
  const topic = normalizeTopic(raw.topic);
  if (!topic) return null;

  // 2. 核心修正：处理扁平化的 Source (如果 raw.source 不存在，就从 source_id 等拼接)
  const sourceInput = raw.source || {
    id: raw.source_id,
    name: raw.source_name || raw.source_id, // 备选方案
    domain: raw.source_domain,
    country: raw.source_country,
    language: raw.source_language,
    logo: raw.source_logo || raw.logo_url
  };
  const source = normalizeSource(sourceInput);

  const sentimentInput = raw.sentiment || {
    type: raw.sentiment_type || 'neutral',
    score: Number(raw.sentiment_score) || 0,
    comparative: Number(raw.sentiment_polarity) || 0,
    probabilities: {
      positive: Number(raw.sentiment_pos) || (raw.sentiment_type === 'positive' ? 1 : 0),
      neutral: Number(raw.sentiment_neu) || (raw.sentiment_type === 'neutral' ? 1 : 0),
      negative: Number(raw.sentiment_neg) || (raw.sentiment_type === 'negative' ? 1 : 0),
    },
    model: raw.sentiment_model || 'general'
  };

  const toxicityInput = raw.toxicity || {
    label: raw.toxicity_label,
    score: Number(raw.toxicity_score) || 0
  };

  const readabilityInput = raw.readability || {
    wordCount: Number(raw.word_count) || 0,
    readingTimeMin: Number(raw.reading_time_min) || 0,
    fleschScore: Number(raw.flesch_score) || 0,
    fleschKincaid: Number(raw.flesch_kincaid) || 0,
    smogIndex: Number(raw.smog_index) || 0
  };

  const canonicalUrl = pickString(raw.canonical_url, raw.canonicalUrl);
  const url = pickString(raw.url, canonicalUrl) ?? '';
  const publishedAt = pickString(raw.published_at, raw.publishedAt) ?? new Date(0).toISOString();
  const fallbackId = (canonicalUrl ?? url) || `${topic}-${publishedAt}`;

  return {
    id: pickString(raw.id) ?? encodeURIComponent(fallbackId),
    canonicalUrl,
    source,
    author: pickString(raw.author_name, raw.author) ?? 'Unknown',
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

    // 使用刚才拼接的 Input
    sentiment: normalizeSentiment(sentimentInput),
    toxicity: normalizeToxicity(toxicityInput),
    readability: normalizeReadability(readabilityInput),

    topic,
    section: pickString(raw.section),
    metaTags: asStringArray(raw.meta_tags ?? raw.metaTags ?? []),
    ogType: pickString(raw.og_type, raw.ogType),
    language: pickString(raw.language, source.language),

    // 确保数组不为 null
    keywords: asStringArray(raw.keywords ?? []),
    entities: normalizeEntities(raw.entities || {}),
    relatedUrls: asStringArray(raw.related_urls ?? raw.relatedUrls ?? []),

    aiConfidence: (raw.ai_confidence ?? raw.ai_relevance) ? Number(raw.ai_confidence ?? raw.ai_relevance) : (pickNumber(raw.aiConfidence, raw.aiRelevance) ?? undefined),
    aiTopLabel: pickString(raw.ai_top_label, raw.aiTopLabel),
    aiLabelScores: asNumberRecord(raw.ai_label_scores ?? raw.aiLabelScores ?? {}),

    isPremium: pickBoolean(raw.is_premium, raw.isPremium),
    isAccessibleFree: pickBoolean(raw.is_accessible_free, raw.isAccessibleFree),
    jsonldWordCount: pickNumber(raw.jsonld_word_count, raw.jsonldWordCount),

    // 处理 OG (DB 回传可能是 og_data)
    og: normalizeOpenGraph(raw.og || raw.og_data),
  };
};

// ─── Stable hash (unchanged) ─────────────────────────────────────────────────

const stableHash = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

// ─── Remote data loader with in-memory cache ─────────────────────────────────
//
// fetchRawData() is called once; all subsequent calls reuse the same Promise,
// so the HTTP request is never duplicated even if many functions are awaited
// simultaneously.

let storePromise: Promise<NormalizedStore> | null = null;
let storeFetchedAt = 0;

const buildStore = (raw: RawNewsData): NormalizedStore => {
  const articles = (raw.articles ?? [])
    .map(normalizeArticle)
    .filter((article): article is NewsArticle => article !== null)
    .sort((left, right) => {
      const diff =
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
      return diff !== 0 ? diff : (right.aiConfidence ?? 0) - (left.aiConfidence ?? 0);
    });

  const datasetCategories = asStringArray(raw.categories)
    .map(normalizeTopic)
    .filter((topic): topic is NewsTopic => topic !== null);

  const modelEntries = Object.entries(asRecord(raw.aiModels))
    .map(([key, value]) => [key, pickString(value) ?? String(value)])
    .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1]));
  const aiModels: Record<string, string> = Object.fromEntries(modelEntries);
  if (Object.keys(aiModels).length === 0) {
    const detectedModels = Array.from(
      new Set(
        articles
          .map((article) => pickString(article.sentiment.model))
          .filter((item): item is string => item !== null)
      )
    ).sort();
    detectedModels.forEach((modelName, index) => {
      aiModels[`sentiment_${index + 1}`] = modelName;
    });
  }

  const scrapedAtCandidates = articles
    .map((article) => pickString(article.scrapedAt, article.publishedAt))
    .filter((value): value is string => value !== null)
    .map((value) => ({ raw: value, ts: new Date(value).getTime() }))
    .filter((entry) => !Number.isNaN(entry.ts))
    .sort((left, right) => right.ts - left.ts);
  const status = pickString(raw.status) ?? 'ok';

  const snapshot: DatasetSnapshot = {
    status,
    totalResults: typeof raw.totalResults === 'number' ? raw.totalResults : articles.length,
    articleCount: articles.length,
    scrapedAt: pickString(raw.scrapedAt) ?? scrapedAtCandidates[0]?.raw ?? null,
    categories: datasetCategories.length > 0 ? datasetCategories : [...SUPPORTED_TOPICS],
    aiModels,
    sourceCount: new Set(articles.map((a) => a.source.id ?? a.source.name)).size,
  };

  return { articles, snapshot, status: snapshot.status };
};

/**
 * Returns a cached Promise that resolves to the normalised data store.
 * Call `invalidateCache()` to force a fresh fetch on the next access.
 */
const getStore = (): Promise<NormalizedStore> => {
  const now = Date.now();
  if (storePromise && now - storeFetchedAt <= STORE_CACHE_TTL_MS) {
    return storePromise;
  }

  const requestUrl = `${API_BASE_URL}?_=${now}`;
  storeFetchedAt = now;
  const requestPromise = fetch(requestUrl, {
    cache: 'no-store',
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json() as Promise<RawNewsData>;
    })
    .then(buildStore)
    .catch((err) => {
      // Clear cache so the next call retries instead of returning the failed promise
      storePromise = null;
      storeFetchedAt = 0;
      throw err;
    });

  storePromise = requestPromise;
  return requestPromise;
};

/** Force a fresh fetch on the next data access (e.g. call after a write). */
export const invalidateCache = (): void => {
  storePromise = null;
  storeFetchedAt = 0;
};

// ─── Internal filter helpers ──────────────────────────────────────────────────

const filterByCategory = (articles: NewsArticle[], category: string): NewsArticle[] => {
  const normalizedCategory = normalizeCategory(category);
  const expectedTopic = TOPIC_MAP[normalizedCategory];
  return expectedTopic ? articles.filter((a) => a.topic === expectedTopic) : articles;
};

const filterBySourceCountry = (articles: NewsArticle[], countryCode: string): NewsArticle[] => {
  const normalizedCode = countryCode.trim().toUpperCase();
  return normalizedCode
    ? articles.filter((a) => a.source.country?.toUpperCase() === normalizedCode)
    : articles;
};

const paginateArticles = (articles: NewsArticle[], pageSize: number, page: number): NewsArticle[] => {
  const safePageSize = pageSize > 0 ? pageSize : 20;
  const safePage = page > 0 ? page : 1;
  const startIndex = (safePage - 1) * safePageSize;
  return articles.slice(startIndex, startIndex + safePageSize);
};

// ─── Headline ranking ─────────────────────────────────────────────────────────
//
// "Top headlines" means the most intense / discussed stories, not merely the
// newest. The score blends how strongly non-neutral the article reads, the
// model's confidence, and recency (product decision):
//   score = 0.5 * sentimentIntensity + 0.3 * aiConfidence + 0.2 * recency
// recency is min/max-normalised across the input set so it stays comparable
// regardless of how old the dataset is.
const rankByImportance = (articles: NewsArticle[]): NewsArticle[] => {
  if (articles.length === 0) return [];

  const times = articles
    .map((article) => new Date(article.publishedAt).getTime())
    .filter((time) => !Number.isNaN(time));
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const span = maxTime - minTime;

  const scoreOf = (article: NewsArticle): number => {
    const intensity = Math.abs(clampSignedUnit(article.sentiment.comparative));
    const aiConfidence = clampUnit(article.aiConfidence ?? 0);
    const timestamp = new Date(article.publishedAt).getTime();
    const recencyNorm = span > 0 && !Number.isNaN(timestamp) ? (timestamp - minTime) / span : 1;
    return 0.5 * intensity + 0.3 * aiConfidence + 0.2 * recencyNorm;
  };

  return [...articles].sort((left, right) => scoreOf(right) - scoreOf(left));
};

const buildSuccessResponse = (
  articles: NewsArticle[],
  status: string,
  message: string,
  pageSize: number,
  page: number
): ServerResponse => ({
  status: 200,
  success: true,
  message,
  data: {
    status,
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

// ─── Public API ───────────────────────────────────────────────────────────────

export const getAllArticles = async (category: NewsCategoryFilter = 'all'): Promise<NewsArticle[]> => {
  const { articles } = await getStore();
  return filterByCategory(articles, category);
};

export const getDatasetSnapshot = async (): Promise<DatasetSnapshot> => {
  const { snapshot } = await getStore();
  return { ...snapshot };
};

export const getArticleId = (article: Pick<NewsArticle, 'id' | 'url' | 'title'>): string =>
  article.id || encodeURIComponent(article.url || article.title);

/** Fetch a random quote from the backend FavQs proxy (GET /api/quotes/random). */
export const getRandomQuote = async (): Promise<DailyQuote | null> => {
  try {
    const res = await fetch(`${BASE_URL}/api/quotes/random`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success && json.data?.quote ? json.data : null;
  } catch {
    return null;
  }
};

export const getArticleById = async (articleId: string): Promise<NewsArticle | null> => {
  const { articles } = await getStore();
  const directMatch = articles.find((a) => a.id === articleId);
  if (directMatch) return directMatch;
  try {
    const decoded = decodeURIComponent(articleId);
    return articles.find((a) => a.url === decoded || a.title === decoded) ?? null;
  } catch {
    return null;
  }
};

export const getSentimentDistribution = async (
  category: NewsCategoryFilter = 'all'
): Promise<SentimentDistributionItem[]> => {
  const { articles } = await getStore();
  const counts: Record<SentimentType, number> = { positive: 0, neutral: 0, negative: 0 };
  filterByCategory(articles, category).forEach((a) => {
    counts[a.sentiment.type] += 1;
  });
  return SENTIMENT_TYPES.map((type) => ({ type, count: counts[type] }));
};

export const getLatestArticles = async (
  limit = 6,
  category: NewsCategoryFilter = 'all'
): Promise<NewsArticle[]> => {
  const { articles } = await getStore();
  return filterByCategory(articles, category).slice(0, Math.max(0, limit));
};

/**
 * Top headlines ranked by importance (intensity + AI confidence + recency)
 * rather than pure recency. Used by the Top Headlines page; defaults to 10.
 */
export const getRankedHeadlines = async (
  limit = 10,
  category: NewsCategoryFilter = 'all'
): Promise<NewsArticle[]> => {
  const { articles } = await getStore();
  const filtered = filterByCategory(articles, category);
  return rankByImportance(filtered).slice(0, Math.max(0, limit));
};

export const getTrendingKeywords = async (
  limit = 10,
  category: NewsCategoryFilter = 'all'
): Promise<TrendingKeyword[]> => {
  const { articles } = await getStore();
  const keywordMap = new Map<string, number>();

  filterByCategory(articles, category).forEach((article) => {
    const seenInArticle = new Set<string>();

    article.keywords.forEach((keyword) => {
      const normalized = normalizeKeywordToken(keyword);
      if (!normalized || seenInArticle.has(normalized)) return;
      seenInArticle.add(normalized);
      keywordMap.set(normalized, (keywordMap.get(normalized) ?? 0) + 3);
    });

    article.metaTags.forEach((tag) => {
      const normalized = normalizeKeywordToken(tag);
      if (!normalized || seenInArticle.has(normalized)) return;
      seenInArticle.add(normalized);
      keywordMap.set(normalized, (keywordMap.get(normalized) ?? 0) + 1);
    });
  });

  return [...keywordMap.entries()]
    .sort((left, right) =>
      right[1] === left[1] ? left[0].localeCompare(right[0]) : right[1] - left[1]
    )
    .slice(0, Math.max(0, limit))
    .map(([keyword, count]) => ({ keyword, count }));
};

export const getLiveEngagement = async (
  timestamp = Date.now(),
  limit = 8,
  category: NewsCategoryFilter = 'all'
): Promise<LiveEngagementItem[]> => {
  const { articles } = await getStore();
  const tick = timestamp / 10000;
  return filterByCategory(articles, category)
    .map((article) => {
      const seed = stableHash(article.id || article.title);
      const phase = tick + (seed % 37);
      return {
        articleId: getArticleId(article),
        title: article.title,
        topic: article.topic,
        sentiment: article.sentiment.type,
        publishedAt: article.publishedAt,
        views: Math.max(0, Math.round(1200 + (seed % 8500) + Math.sin(phase) * 280)),
        likes: Math.max(0, Math.round(220 + (seed % 2200) + Math.cos(phase * 1.1) * 95)),
        interactions: Math.max(0, Math.round(480 + (seed % 3400) + Math.sin(phase * 0.9) * 140)),
      };
    })
    .sort((left, right) => right.interactions - left.interactions)
    .slice(0, Math.max(0, limit));
};

export const newsAPI = {
  getAllNews: async (pageSize = 40, page = 1): Promise<ServerResponse> => {
    try {
      const { articles, status } = await getStore();
      return buildSuccessResponse(articles, status, 'Articles fetched successfully', pageSize, page);
    } catch (error) {
      return buildFailureResponse('Failed to fetch articles', error);
    }
  },

  getTopHeadlines: async (category = 'all', pageSize = 80, page = 1): Promise<ServerResponse> => {
    try {
      const { articles, status } = await getStore();
      const filtered = filterByCategory(articles, category);
      return buildSuccessResponse(filtered, status, 'Top headlines fetched successfully', pageSize, page);
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
      const { articles, status } = await getStore();
      const filtered = filterBySourceCountry(articles, countryCode);
      return buildSuccessResponse(
        filtered,
        status,
        'Country headlines fetched successfully',
        pageSize,
        page
      );
    } catch (error) {
      return buildFailureResponse('Failed to fetch country headlines', error);
    }
  },
};
