import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Building2,
  Clock3,
  ExternalLink,
  Gauge,
  Globe,
  Link2,
  MapPin,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ArticleSentimentPanel } from '../ArticleSentimentPanel';
import { getArticleId } from '../../services/newsAPI';
import type { Translations } from '../../i18n/translations';
import type { LiveEngagementItem, NewsArticle, TrendingKeyword } from '../../types/article';
import type { SentimentDistributionItem } from '../../types/sentiment';
import {
  SENTIMENT_BAR_STYLE,
  SENTIMENT_CHART_COLORS,
  SENTIMENT_STYLE,
  formatAccessStatus,
  formatCount,
  formatHost,
  formatPercent,
  formatPublishedDate,
  formatRelativeTime,
  mutedTextClass,
  panelBaseClass,
  sentimentPillClass,
  sentimentTextClass,
} from './helpers';

interface EntityBlockProps {
  title: string;
  values: string[];
  icon: ReactNode;
  isDark: boolean;
}

function EntityBlock({ title, values, icon, isDark }: EntityBlockProps) {
  return (
    <div>
      <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
        {icon}{title}
      </h4>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span key={`${title}-${value}`} className={`px-2.5 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-700'}`}>
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>None listed</p>
      )}
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: string;
  isDark: boolean;
  accentClass?: string;
}

function MetricRow({ label, value, isDark, accentClass }: MetricRowProps) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${isDark ? 'bg-slate-900/40' : 'bg-gray-50/80'}`}>
      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm font-semibold ${accentClass ?? (isDark ? 'text-slate-100' : 'text-gray-900')}`}>{value}</span>
    </div>
  );
}

interface SentimentTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  total: number;
  isDark: boolean;
}

function SentimentTooltip({ active, payload, total, isDark }: SentimentTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = Number(payload[0].value ?? 0);
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`px-3 py-2 rounded-lg text-xs shadow-lg ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-gray-800 border border-gray-100'}`}>
      <p className="font-semibold">{payload[0].name}</p>
      <p>{value} articles ({percentage}%)</p>
    </div>
  );
}

interface ArticleSidebarProps {
  article: NewsArticle;
  isDark: boolean;
  t: Translations;
  categorySentimentDistribution: SentimentDistributionItem[];
  categoryArticles: NewsArticle[];
  categoryTrendingKeywords: TrendingKeyword[];
  categoryLiveEngagement: LiveEngagementItem[];
}

export function ArticleSidebar({
  article,
  isDark,
  t,
  categorySentimentDistribution,
  categoryArticles,
  categoryTrendingKeywords,
  categoryLiveEngagement,
}: ArticleSidebarProps) {
  const panelBase = panelBaseClass(isDark);
  const mutedText = mutedTextClass(isDark);

  const categorySentimentTotal = useMemo(
    () => categorySentimentDistribution.reduce((sum, item) => sum + item.count, 0),
    [categorySentimentDistribution]
  );

  const categorySentimentChartData = useMemo(
    () => categorySentimentDistribution.map((item) => ({
      type: item.type,
      name: t[item.type],
      value: item.count,
      color: SENTIMENT_CHART_COLORS[item.type],
    })),
    [categorySentimentDistribution, t]
  );

  const categoryArticlePreview = useMemo(() => categoryArticles.slice(0, 12), [categoryArticles]);

  const categoryMaxKeywordCount = useMemo(
    () => categoryTrendingKeywords.reduce((max, item) => Math.max(max, item.count), 1),
    [categoryTrendingKeywords]
  );

  return (
    <div className="space-y-4">
      <ArticleSentimentPanel article={article} isDark={isDark} />

      {/* Category Sentiment Distribution — right under the article's own
          sentiment so the single-article and category views read together. */}
      <div className={`rounded-2xl border p-5 ${panelBase}`}>
        <h3 className={`font-poppins text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
          Category Sentiment Distribution
        </h3>
        <p className={`text-xs mb-4 ${mutedText}`}>{article.topic} articles in current dataset</p>

        <div className="h-[140px] w-full mb-4 flex min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categorySentimentChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={58} paddingAngle={2} dataKey="value">
                {categorySentimentChartData.map((item) => (
                  <Cell key={`article-category-sentiment-${item.type}`} fill={item.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<SentimentTooltip isDark={isDark} total={categorySentimentTotal} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2.5">
          {categorySentimentDistribution.map((item) => {
            const percentage = categorySentimentTotal > 0 ? Math.round((item.count / categorySentimentTotal) * 100) : 0;
            return (
              <div key={item.type} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-16 text-xs ${mutedText}`}>{t[item.type]}</span>
                  <div className={`h-2 rounded-full overflow-hidden flex-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    <div className={`h-full rounded-full ${SENTIMENT_BAR_STYLE[item.type]}`} style={{ width: `${percentage}%` }} />
                  </div>
                  <span className={`text-xs font-semibold ${SENTIMENT_STYLE[item.type].label}`}>
                    {item.count} ({percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-4 text-xs">
          <span className={mutedText}>Total in category</span>
          <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{categorySentimentTotal}</span>
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${panelBase}`}>
        <h3 className={`font-poppins text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
          <Sparkles size={14} className="text-cyan-500" />Article Intelligence
        </h3>
        <div className="space-y-2.5">
          <MetricRow label="AI confidence" value={formatPercent(article.aiConfidence)} isDark={isDark} accentClass={isDark ? 'text-cyan-300' : 'text-cyan-700'} />
          <MetricRow label="Top label" value={article.aiTopLabel || 'Unavailable'} isDark={isDark} />
          <MetricRow label="Sentiment model" value={article.sentiment.model || 'Unknown'} isDark={isDark} />
          <MetricRow label="Toxicity score" value={`${article.toxicity.label} (${formatPercent(article.toxicity.score)})`} isDark={isDark} accentClass={article.toxicity.score > 0.5 ? 'text-red-500' : isDark ? 'text-slate-100' : 'text-gray-900'} />
          <MetricRow label="Word count" value={formatCount(article.readability.wordCount)} isDark={isDark} />
          <MetricRow label="Reading grade" value={article.readability.fleschKincaid.toFixed(1)} isDark={isDark} />
          <MetricRow label="Flesch score" value={article.readability.fleschScore.toFixed(1)} isDark={isDark} />
          <MetricRow label="SMOG index" value={article.readability.smogIndex.toFixed(1)} isDark={isDark} />
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${panelBase}`}>
        <h3 className={`font-poppins text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
          <Globe size={14} className="text-cyan-500" />Source and Access
        </h3>
        <div className="space-y-2.5">
          <MetricRow label="Source" value={article.source.name} isDark={isDark} />
          <MetricRow label="Domain" value={article.source.domain || formatHost(article.url)} isDark={isDark} />
          <MetricRow label="Country" value={article.source.country || 'Unknown'} isDark={isDark} />
          <MetricRow label="Language" value={(article.language || article.source.language || 'Unknown').toUpperCase()} isDark={isDark} />
          <MetricRow label="Section" value={article.section || 'Unspecified'} isDark={isDark} />
          <MetricRow label="Access" value={formatAccessStatus(article)} isDark={isDark} />
          <MetricRow label="Updated" value={article.modifiedAt ? formatPublishedDate(article.modifiedAt) : 'Unavailable'} isDark={isDark} />
          <MetricRow label="Scraped" value={article.scrapedAt ? formatPublishedDate(article.scrapedAt) : 'Unavailable'} isDark={isDark} />
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${panelBase}`}>
        <h3 className={`font-poppins text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
          <Tag size={14} className="text-cyan-500" />Keywords and Tags
        </h3>
        {article.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.keywords.map((keyword) => (
              <span key={`keyword-${keyword}`} className={`px-2.5 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-700'}`}>
                #{keyword}
              </span>
            ))}
          </div>
        ) : (
          <p className={`text-sm mb-4 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>No keywords extracted for this article.</p>
        )}
        {article.metaTags.length > 0 && (
          <div>
            <p className={`text-xs font-medium mb-2 ${mutedText}`}>Meta tags</p>
            <div className="flex flex-wrap gap-2">
              {article.metaTags.map((tagValue) => (
                <span key={`meta-${tagValue}`} className={`px-2.5 py-1 rounded-full text-xs ${isDark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-700'}`}>
                  {tagValue}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trending Topics */}
      <div className={`rounded-2xl border p-5 ${panelBase}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <TrendingUp size={13} className="text-white" />
          </div>
          <h3 className={`font-poppins text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
            Trending Topics ({article.topic})
          </h3>
        </div>
        <div className="space-y-2">
          {categoryTrendingKeywords.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.noResults}</p>
          ) : (
            categoryTrendingKeywords.map((topic, index) => (
              <div key={`${article.topic}-${topic.keyword}`} className="flex items-center gap-2">
                <span className={`text-xs font-bold w-4 ${mutedText}`}>{index + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>{topic.keyword}</span>
                    <span className={`text-xs ${mutedText}`}>{topic.count}</span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(topic.count / categoryMaxKeywordCount) * 100}%`, background: '#06b6d4' }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live View */}
      <div className={`rounded-2xl border p-5 ${panelBase}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Clock3 size={13} className="text-white" />
            </div>
            <h3 className={`font-poppins text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
              Live View ({article.topic})
            </h3>
          </div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
            {categoryArticles.length} articles
          </span>
        </div>
        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
          {categoryArticlePreview.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.noResults}</p>
          ) : (
            categoryArticlePreview.map((categoryArticle) => (
              <Link key={categoryArticle.id} to={`/article/${getArticleId(categoryArticle)}`} className={`block rounded-xl p-2.5 transition-colors ${isDark ? 'hover:bg-slate-700/60' : 'hover:bg-gray-50'}`}>
                <p className={`text-sm font-medium line-clamp-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{categoryArticle.title}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
                  <span className={mutedText}>{formatRelativeTime(categoryArticle.publishedAt)}</span>
                  <span className={`${isDark ? 'text-slate-400' : 'text-gray-500'}`}>.</span>
                  <span className={sentimentTextClass[categoryArticle.sentiment.type]}>{categoryArticle.sentiment.type}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Live Engagement */}
      <div className={`rounded-2xl border p-5 ${panelBase}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Users size={13} className="text-white" />
          </div>
          <h3 className={`font-poppins text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
            Live Engagement ({article.topic})
          </h3>
        </div>
        <div className="space-y-2.5">
          {categoryLiveEngagement.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.noResults}</p>
          ) : (
            categoryLiveEngagement.map((item) => (
              <Link key={item.articleId} to={`/article/${item.articleId}`} className={`block rounded-xl p-2.5 transition-colors ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50/90 hover:bg-gray-100'}`}>
                <p className={`text-sm font-medium line-clamp-1 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{item.title}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
                  <span className={`${sentimentPillClass[item.sentiment]} px-2 py-0.5 rounded-full`}>{item.sentiment}</span>
                  <span className={`${isDark ? 'text-slate-400' : 'text-gray-500'}`}>.</span>
                  <span className={mutedText}>{formatRelativeTime(item.publishedAt)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div><p className={mutedText}>Views</p><p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{formatCount(item.views)}</p></div>
                  <div><p className={mutedText}>Likes</p><p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{formatCount(item.likes)}</p></div>
                  <div><p className={mutedText}>Interactions</p><p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{formatCount(item.interactions)}</p></div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Entities */}
      <div className={`rounded-2xl border p-5 ${panelBase}`}>
        <h3 className={`font-poppins text-sm font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>Entities</h3>
        <div className="space-y-4">
          <EntityBlock title="Persons" values={article.entities.persons} icon={<Users size={14} className="text-cyan-500" />} isDark={isDark} />
          <EntityBlock title="Organizations" values={article.entities.organizations} icon={<Building2 size={14} className="text-cyan-500" />} isDark={isDark} />
          <EntityBlock title="Locations" values={article.entities.locations} icon={<MapPin size={14} className="text-cyan-500" />} isDark={isDark} />
          <EntityBlock title="Misc" values={article.entities.misc} icon={<Gauge size={14} className="text-cyan-500" />} isDark={isDark} />
        </div>
      </div>

      {/* Related Coverage */}
      <div className={`rounded-2xl border p-5 ${panelBase}`}>
        <h3 className={`font-poppins text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
          <Link2 size={14} className="text-cyan-500" />Related Coverage
        </h3>
        <div className="space-y-2.5">
          {article.relatedUrls.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>No related links extracted.</p>
          ) : (
            article.relatedUrls.slice(0, 6).map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={`block rounded-xl p-2.5 transition-colors ${isDark ? 'hover:bg-slate-700/60' : 'hover:bg-gray-50'}`}>
                <p className={`text-sm font-medium line-clamp-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{url}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px]">
                  <span className={mutedText}>{formatHost(url)}</span>
                  <ExternalLink size={12} className={mutedText} />
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
