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
