/** Feature flag: the posts/quotes social feed (F7). Backend + UI landed —
 * composer, /posts page, nav tabs and the interleaved Pulse rail are live. */
export const POSTS_ENABLED = true;

export const CATEGORIES = [
  'sport',
  'health',
  'travel',
  'business',
  'world',
  'politics',
  'entertainment',
  'science',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  sport: 'Sport',
  health: 'Health',
  travel: 'Travel',
  business: 'Business',
  world: 'World',
  politics: 'Politics',
  entertainment: 'Entertainment',
  science: 'Science',
};

export const CATEGORY_TOPIC_MAP = {
  sport: 'Sport',
  health: 'Health',
  travel: 'Travel',
  business: 'Business',
  world: 'World',
  politics: 'Politics',
  entertainment: 'Entertainment',
  science: 'Science',
} as const;

export type CategoryTopic = (typeof CATEGORY_TOPIC_MAP)[Category];

export const TOPIC_TO_CATEGORY: Record<CategoryTopic, Category> = {
  Sport: 'sport',
  Health: 'health',
  Travel: 'travel',
  Business: 'business',
  World: 'world',
  Politics: 'politics',
  Entertainment: 'entertainment',
  Science: 'science',
};

export const CATEGORY_BADGE_CLASS: Record<Category, string> = {
  sport: 'bg-orange-500 text-white',
  health: 'bg-emerald-600 text-white',
  travel: 'bg-amber-500 text-white',
  business: 'bg-indigo-600 text-white',
  world: 'bg-slate-600 text-white',
  politics: 'bg-sky-600 text-white',
  entertainment: 'bg-fuchsia-600 text-white',
  science: 'bg-teal-600 text-white',
};

export const TOPIC_BADGE_CLASS: Record<CategoryTopic, string> = {
  Sport: CATEGORY_BADGE_CLASS.sport,
  Health: CATEGORY_BADGE_CLASS.health,
  Travel: CATEGORY_BADGE_CLASS.travel,
  Business: CATEGORY_BADGE_CLASS.business,
  World: CATEGORY_BADGE_CLASS.world,
  Politics: CATEGORY_BADGE_CLASS.politics,
  Entertainment: CATEGORY_BADGE_CLASS.entertainment,
  Science: CATEGORY_BADGE_CLASS.science,
};

// ─── Sources ────────────────────────────────────────────────────────────────
// Stable source identifiers used by the source filter (AppContext.selectedSources)
// and the scraper. `matchers` are lowercase substrings tested against an article's
// source id / name / domain, so filtering keeps working regardless of how the live
// DB labels each source.

export interface SourceOption {
  id: string; // stable key stored in selectedSources, e.g. 'cnn'
  name: string; // display label
  domain: string; // canonical domain — also used to fetch a favicon logo
  matchers: string[];
}

export const SOURCES: SourceOption[] = [
  { id: 'cnn', name: 'CNN', domain: 'edition.cnn.com', matchers: ['cnn'] },
  { id: 'bbc', name: 'BBC', domain: 'bbc.com', matchers: ['bbc'] },
  {
    id: 'aljazeera',
    name: 'Al Jazeera',
    domain: 'aljazeera.com',
    matchers: ['aljazeera', 'al jazeera', 'jazeera'],
  },
  { id: 'yahoo_tw', name: 'Yahoo TW', domain: 'tw.news.yahoo.com', matchers: ['yahoo'] },
];

/** Favicon-based logo for a source domain (Google's public favicon service). */
export const sourceLogoUrl = (domain: string): string =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

/**
 * Resolve an article's source to one of the known SOURCES ids, or null if it
 * matches none. Tests id, name and domain so it works regardless of how the live
 * DB labels the source.
 */
export const matchSourceId = (
  source: { id?: string | null; name?: string | null; domain?: string | null }
): string | null => {
  const haystack = [source.id, source.name, source.domain]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!haystack) return null;
  return SOURCES.find((s) => s.matchers.some((m) => haystack.includes(m)))?.id ?? null;
};

export const COUNTRIES = [
  { code: 'us', name: 'United States' },
  { code: 'id', name: 'Indonesia' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'au', name: 'Australia' },
  { code: 'jp', name: 'Japan' },
  { code: 'cn', name: 'China' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'in', name: 'India' },
  { code: 'br', name: 'Brazil' },
] as const;

/** Country page → source ids served from that country. Codes without an entry
 * have no scraped source yet and render an empty state. */
export const COUNTRY_SOURCE_MAP: Record<string, string[]> = {
  us: ['cnn'],
  gb: ['bbc'],
  qa: ['aljazeera'],
  tw: ['yahoo_tw'],
};
