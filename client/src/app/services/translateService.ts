import type { Language } from '../i18n/translations';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// API-side language codes (what the backend /translate endpoint expects).
export type ApiLang = 'en' | 'id' | 'zh-CN' | 'zh-TW';

// Maps the client's Language union onto the backend's ApiLang codes.
export const LANGUAGE_API_CODE: Record<Language, ApiLang> = {
  en: 'en',
  id: 'id',
  zhCN: 'zh-CN',
  zhTW: 'zh-TW',
};

export interface ArticleTranslation {
  articleId: string;
  lang: ApiLang;
  title: string | null;
  description: string | null;
  content: string | null;
  aiSummary: string | null;
  cached: boolean;
  autoTranslated: boolean;
  provider: string;
}

/**
 * Fetch a translation of the given article from the backend proxy.
 * The backend handles cache lookup, Gemini, and Lingva fallback — the
 * GEMINI_API_KEY never reaches the client. Returns null on any failure.
 */
export async function fetchArticleTranslation(
  articleId: string,
  lang: ApiLang
): Promise<ArticleTranslation | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/articles/${encodeURIComponent(articleId)}/translate?lang=${encodeURIComponent(lang)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success && json.data ? (json.data as ArticleTranslation) : null;
  } catch {
    return null;
  }
}
