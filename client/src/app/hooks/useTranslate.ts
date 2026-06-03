import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { NewsArticle } from '../types/article';
import {
  fetchArticleTranslation,
  LANGUAGE_API_CODE,
  type ApiLang,
  type ArticleTranslation,
} from '../services/translateService';

export interface UseTranslateResult {
  title: string;
  description: string | null;
  content: string | null;
  aiSummary: string | null;
  isLoading: boolean;
  isAutoTranslated: boolean;
  error: string | null;
}

// Module-level cache so revisiting an article in a language already fetched is
// instant and never re-hits the network.
const cache = new Map<string, ArticleTranslation>();

// Best-effort: is the article already written in the target language? Mirrors
// the backend's normalizeStoredLang so we can skip a needless request.
function articleMatchesLang(article: NewsArticle, target: ApiLang): boolean {
  const l = (article.language ?? '').trim().toLowerCase();
  if (!l) return false;
  if (target === 'en') return l === 'en' || l.startsWith('en-');
  if (target === 'id') return l === 'id' || l.startsWith('id-');
  if (target === 'zh-TW') return l === 'zh-tw' || l === 'zh_hant' || l === 'zh-hant';
  if (target === 'zh-CN') return l === 'zh-cn' || l === 'zh' || l === 'zh-hans' || l === 'zh_hans';
  return false;
}

/**
 * Returns the article's effective (possibly translated) text fields.
 * When translateMode is off — or the article is already in the selected
 * language — the originals are returned untouched.
 */
export function useTranslate(article: NewsArticle | null): UseTranslateResult {
  const { language, translateMode } = useApp();
  const target = LANGUAGE_API_CODE[language];

  const [override, setOverride] = useState<ArticleTranslation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);

    if (!article || !translateMode || articleMatchesLang(article, target)) {
      setOverride(null);
      setIsLoading(false);
      return;
    }

    const key = `${article.id}:${target}`;
    const cached = cache.get(key);
    if (cached) {
      setOverride(cached);
      setIsLoading(false);
      return;
    }

    let active = true;
    setOverride(null);
    setIsLoading(true);
    fetchArticleTranslation(article.id, target)
      .then((result) => {
        if (!active) return;
        if (result && result.autoTranslated) {
          cache.set(key, result);
          setOverride(result);
        } else {
          if (!result) setError('translation_failed');
          setOverride(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [article, translateMode, target]);

  if (override && override.autoTranslated) {
    return {
      title: override.title ?? article?.title ?? '',
      description: override.description ?? article?.description ?? null,
      content: override.content ?? article?.content ?? null,
      aiSummary: override.aiSummary ?? article?.aiSummary ?? null,
      isLoading,
      isAutoTranslated: true,
      error,
    };
  }

  return {
    title: article?.title ?? '',
    description: article?.description ?? null,
    content: article?.content ?? null,
    aiSummary: article?.aiSummary ?? null,
    isLoading,
    isAutoTranslated: false,
    error,
  };
}
