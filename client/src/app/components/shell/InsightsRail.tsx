import { useApp } from '../../contexts/AppContext';
import { CATEGORY_LABELS } from '../../constants';
import { useStatsOverview } from '../../hooks/useStats';
import { useLatestArticles } from '../../hooks/useArticles';
import type { DatasetSnapshot } from '../../types/api';
import { SentimentChart } from '../sentiment/SentimentChart';
import { LiveView } from '../sentiment/LiveView';
import { TrendingKeywords } from '../sentiment/TrendingKeywords';
import { LiveEngagement } from '../sentiment/LiveEngagement';
import { DatasetStats } from '../sentiment/DatasetStats';

/** Compact analytics for the right rail's Insights tab — the full set from
 * the old SentimentPanel: sentiment donut, live view, trending keywords,
 * live engagement and dataset stats. Stats come from the SQL-side /api/stats
 * endpoints; article lists from the cheap paginated endpoint (never the
 * legacy full-dataset store). */
export function InsightsRail() {
  const { t, selectedCategory } = useApp();
  const { data: overview } = useStatsOverview(selectedCategory);
  const { data: latest } = useLatestArticles({ limit: 8, category: selectedCategory });

  const categoryLabel =
    selectedCategory === 'all' ? t.allCategories : CATEGORY_LABELS[selectedCategory];

  const snapshot: DatasetSnapshot = {
    status: 'ok',
    totalResults: overview?.total ?? 0,
    articleCount: overview?.total ?? 0,
    scrapedAt: overview?.scrapedAt ?? null,
    categories: (overview?.categories ?? []) as DatasetSnapshot['categories'],
    aiModels: overview?.aiModels ?? {},
    sourceCount: overview?.sourceCount ?? 0,
  };

  return (
    <div className="space-y-4 w-full">
      <SentimentChart />
      <LiveView articles={latest?.articles ?? []} categoryLabel={categoryLabel} />
      <TrendingKeywords />
      <LiveEngagement />
      <DatasetStats
        articleCount={overview?.total ?? 0}
        keywordCount={overview?.keywordCount ?? 0}
        snapshot={snapshot}
        categoryLabel={categoryLabel}
      />
    </div>
  );
}
