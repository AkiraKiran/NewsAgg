import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { CATEGORY_LABELS } from '../constants';
import { getAllArticles, getDatasetSnapshot, getTrendingKeywords } from '../services/newsAPI';
import type { NewsArticle, NewsCategoryFilter, TrendingKeyword } from '../types/article';
import type { DatasetSnapshot } from '../types/api';
import { SentimentChart } from './sentiment/SentimentChart';
import { LiveView } from './sentiment/LiveView';
import { TrendingKeywords } from './sentiment/TrendingKeywords';
import { LiveEngagement } from './sentiment/LiveEngagement';
import { DatasetStats } from './sentiment/DatasetStats';
import { QuoteWidget } from './ui/QuoteWidget';

const EMPTY_SNAPSHOT: DatasetSnapshot = {
  status: 'ok',
  totalResults: 0,
  articleCount: 0,
  scrapedAt: null,
  categories: [],
  aiModels: {},
  sourceCount: 0,
};

/**
 * Orchestrator for the sentiment analytics sidebar. It owns only the data that
 * is shared across multiple panels (the article list + keyword totals feeding
 * both LiveView and DatasetStats, plus the dataset snapshot); each panel fetches
 * its own panel-specific data internally.
 */
export function SentimentPanel() {
  const { t, selectedCategory } = useApp();
  const [datasetSnapshot, setDatasetSnapshot] = useState<DatasetSnapshot>(EMPTY_SNAPSHOT);
  const [allArticles, setAllArticles] = useState<NewsArticle[]>([]);
  const [allKeywords, setAllKeywords] = useState<TrendingKeyword[]>([]);

  const analyticsCategory: NewsCategoryFilter = selectedCategory;
  const activeDataCategoryLabel = selectedCategory === 'all' ? t.allCategories : CATEGORY_LABELS[selectedCategory];

  // Dataset snapshot is category-independent — fetch once.
  useEffect(() => {
    getDatasetSnapshot().then(setDatasetSnapshot);
  }, []);

  // Shared per-category data: the full article list (LiveView + count) and the
  // total keyword set (count only).
  useEffect(() => {
    getAllArticles(analyticsCategory).then(setAllArticles);
    getTrendingKeywords(10000, analyticsCategory).then(setAllKeywords);
  }, [analyticsCategory]);

  return (
    <div className="space-y-4 w-full">
      <SentimentChart />
      <LiveView articles={allArticles} categoryLabel={activeDataCategoryLabel} />
      <TrendingKeywords />
      <LiveEngagement />
      <DatasetStats
        articleCount={allArticles.length}
        keywordCount={allKeywords.length}
        snapshot={datasetSnapshot}
        categoryLabel={activeDataCategoryLabel}
      />
      <QuoteWidget />
    </div>
  );
}
