import { Bookmark, Calendar, Clock3, Globe, Languages, MessageSquareQuote, PlayCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { useBookmarks } from '../../hooks/useBookmarks';
import { CATEGORY_BADGE_CLASS, CATEGORY_LABELS, POSTS_ENABLED, TOPIC_TO_CATEGORY } from '../../constants';
import { getArticleId } from '../../services/newsAPI';
import { ImageWithFallback } from '../utils/ImageWithFallback';
import type { NewsArticle } from '../../types/article';
import { SENTIMENT_STYLE, bodyTextClass, formatPublishedDate, mutedTextClass } from './helpers';

interface ArticleHeaderProps {
  article: NewsArticle;
  isDark: boolean;
}

export function ArticleHeader({ article, isDark }: ArticleHeaderProps) {
  const { t, isAuthenticated, setSidebarOpen } = useApp();
  const { isBookmarked: isArticleBookmarked, bookmarkIdFor, add, remove } = useBookmarks();
  const navigate = useNavigate();
  const mutedText = mutedTextClass(isDark);
  const bodyText = bodyTextClass(isDark);
  const sentimentStyle = SENTIMENT_STYLE[article.sentiment.type];
  const topicBadgeClass = CATEGORY_BADGE_CLASS[TOPIC_TO_CATEGORY[article.topic]];

  const articleId = getArticleId(article);
  const isBookmarked = isArticleBookmarked(articleId);
  const isBookmarking = add.isPending || remove.isPending;

  const handleBookmark = () => {
    if (!isAuthenticated) {
      setSidebarOpen(true); // sign-in gate, same as NewsCard
      return;
    }
    if (isBookmarked) {
      const bookmarkId = bookmarkIdFor(articleId);
      if (bookmarkId) remove.mutate(bookmarkId);
    } else {
      add.mutate(article);
    }
  };

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden mb-5 shadow-lg">
        <ImageWithFallback src={article.urlToImage || article.images[0]?.url || undefined} alt={article.title} className="w-full h-auto object-contain" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${topicBadgeClass}`}>{article.topic}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sentimentStyle.badge}`}>{article.sentiment.type}</span>
          {article.section && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/35 text-white backdrop-blur-sm">{article.section}</span>}
          {article.videoUrl && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/35 text-white backdrop-blur-sm">
              <PlayCircle size={12} />Video
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {article.source.logo && (
          <img src={article.source.logo} alt={article.source.name} className={`w-10 h-10 rounded-full object-cover ${isDark ? 'bg-slate-900/80' : 'bg-white border border-gray-100'}`} />
        )}
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{article.source.name}</p>
          <p className={`text-xs ${mutedText}`}>{CATEGORY_LABELS[TOPIC_TO_CATEGORY[article.topic]]} coverage</p>
        </div>
      </div>

      <h1 className={`font-poppins text-[2rem] font-bold leading-tight mb-4 ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
        {article.title}
      </h1>

      <div className={`flex flex-wrap items-center gap-4 pb-4 mb-6 border-b text-sm ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-1.5"><User size={14} className={mutedText} /><span className={bodyText}>{article.author || 'Unknown'}</span></div>
        <div className="flex items-center gap-1.5"><Calendar size={14} className={mutedText} /><span className={bodyText}>{formatPublishedDate(article.publishedAt)}</span></div>
        <div className="flex items-center gap-1.5"><Globe size={14} className={mutedText} /><span className={bodyText}>{article.source.name}</span></div>
        <div className="flex items-center gap-1.5"><Clock3 size={14} className={mutedText} /><span className={bodyText}>{article.readability.readingTimeMin > 0 ? `${article.readability.readingTimeMin} min read` : 'Quick read'}</span></div>
        {article.language && <div className="flex items-center gap-1.5"><Languages size={14} className={mutedText} /><span className={bodyText}>{article.language.toUpperCase()}</span></div>}
        <button
          type="button"
          onClick={handleBookmark}
          disabled={isBookmarking}
          aria-pressed={isBookmarked}
          className={`ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
            isBookmarked
              ? 'bg-amber-500 text-white'
              : isDark
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
          }`}
        >
          <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
          {isBookmarked ? t.bookmarked : t.bookmark}
        </button>
        {POSTS_ENABLED && (
          <button
            type="button"
            onClick={() => navigate(`/posts?compose=1&attach=${articleId}`)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              isDark
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <MessageSquareQuote size={14} />
            {t.quoteThis}
          </button>
        )}
      </div>
    </>
  );
}
