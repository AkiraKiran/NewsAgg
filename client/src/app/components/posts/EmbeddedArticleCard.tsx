import { Link } from 'react-router';
import { Newspaper } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface EmbeddedArticleCardProps {
  articleId: string | null;
  title: string | null;
  image: string | null;
  topic: string | null;
  sourceName: string | null;
}

/** Compact X-style attached-article card inside a post. The article FK is
 * SET NULL on cleanup, so a missing article renders a tombstone instead. */
export function EmbeddedArticleCard({ articleId, title, image, topic, sourceName }: EmbeddedArticleCardProps) {
  const { t, isDark } = useApp();

  if (!articleId || !title) {
    return (
      <div className={`mt-2 rounded-xl border px-3 py-2.5 text-xs ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
        {t.articleUnavailable}
      </div>
    );
  }

  return (
    <Link
      to={`/article/${articleId}`}
      className={`mt-2 flex gap-3 rounded-xl border overflow-hidden transition-colors ${
        isDark ? 'border-slate-700 hover:bg-slate-800/60' : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      {image ? (
        <img src={image} alt="" className="w-24 h-20 object-cover shrink-0" loading="lazy" />
      ) : (
        <div className={`w-24 h-20 shrink-0 flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <Newspaper size={18} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
        </div>
      )}
      <div className="py-2 pr-3 min-w-0 flex flex-col justify-center">
        <p className={`text-[11px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {[sourceName, topic].filter(Boolean).join(' · ')}
        </p>
        <p className={`text-sm font-medium leading-snug line-clamp-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          {title}
        </p>
      </div>
    </Link>
  );
}
