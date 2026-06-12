import { CATEGORY_TOPIC_MAP, TOPIC_TO_CATEGORY } from '../constants';
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
  LiveEngagementItem,
} from '../types/article';
import type {
  SentimentType,
  NewsSentimentProbabilities,
  NewsSentiment,
} from '../types/sentiment';
import type { RawNewsData } from '../types/api';

export const SUPPORTED_TOPICS = Object.values(CATEGORY_TOPIC_MAP) as NewsTopic[];

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_BASE_URL = `${BASE_URL}/api/news-from-db`;

// ─── Internal maps ────────────────────────────────────────────────────────────

const SENTIMENT_TYPES: SentimentType[] = ['positive', 'neutral', 'negative'];
const TOPIC_VALUES = Object.keys(TOPIC_TO_CATEGORY) as NewsTopic[];

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

const normalizeTopic = (topic: unknown): NewsTopic | null => {
  const rawTopic = asString(topic);
  if (!rawTopic) return null;
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

// ─── Public API ───────────────────────────────────────────────────────────────
// All reads go through the paginated endpoint or the stats endpoints; the old
// full-dataset in-memory store (and every helper that consumed it) is gone.

export const getArticleId = (article: Pick<NewsArticle, 'id' | 'url' | 'title'>): string =>
  article.id || encodeURIComponent(article.url || article.title);

// ─── Paginated API (React Query data layer) ──────────────────────────────────
// Server-side filtering/paging via GET /api/news-from-db's additive mode with
// fields=summary — a fraction of the legacy 400-article payload.

export interface ArticlesPageParams {
  category?: NewsCategoryFilter | string;
  sources?: string[];
  sentiment?: SentimentType | 'all' | '';
  q?: string;
  sort?: 'latest' | 'rank';
  pageSize?: number;
}

export interface ArticlesPage {
  articles: NewsArticle[];
  totalCount: number;
  page: number;
  pageSize: number;
  scrapedAt: string | null;
  categories: string[];
  aiModels: Record<string, string>;
}

export const fetchArticlesPage = async (
  params: ArticlesPageParams,
  page = 1
): Promise<ArticlesPage> => {
  const pageSize = params.pageSize ?? 20;
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  sp.set('pageSize', String(pageSize));
  sp.set('fields', 'summary');
  if (params.category && params.category !== 'all') sp.set('category', String(params.category));
  if (params.sources && params.sources.length > 0) sp.set('source', params.sources.join(','));
  if (params.sentiment && params.sentiment !== 'all') sp.set('sentiment', params.sentiment);
  if (params.q) sp.set('q', params.q);
  if (params.sort === 'rank') sp.set('sort', 'rank');

  const res = await fetch(`${API_BASE_URL}?${sp.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const raw = (await res.json()) as RawNewsData & {
    totalCount?: number;
    page?: number;
    pageSize?: number;
  };

  const articles = (raw.articles ?? [])
    .map(normalizeArticle)
    .filter((article): article is NewsArticle => article !== null);

  return {
    articles,
    totalCount: typeof raw.totalCount === 'number' ? raw.totalCount : articles.length,
    page: raw.page ?? page,
    pageSize: raw.pageSize ?? pageSize,
    scrapedAt: pickString(raw.scrapedAt),
    categories: asStringArray(raw.categories),
    aiModels: Object.fromEntries(
      Object.entries(asRecord(raw.aiModels)).map(([key, value]) => [key, String(value)])
    ),
  };
};

/** Single article via GET /api/articles/:id (full fields). */
export const fetchArticleById = async (articleId: string): Promise<NewsArticle | null> => {
  const res = await fetch(`${BASE_URL}/api/articles/${encodeURIComponent(articleId)}`);
  if (!res.ok) {
    if (res.status === 400 || res.status === 404) return null;
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json?.success && json.data) {
    return normalizeArticle(json.data);
  }
  return null;
};

/** Derive deterministic, gently-oscillating engagement numbers for a set of
 * already-fetched articles — no extra network. */
export const buildLiveEngagement = (
  articles: NewsArticle[],
  timestamp = Date.now(),
  limit = 8
): LiveEngagementItem[] => {
  const tick = timestamp / 10000;
  return articles
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

