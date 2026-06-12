import { Link } from 'react-router';
import { Bookmark, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useBookmarks } from '../../hooks/useBookmarks';

interface BookmarkListProps {
  /** Single column for narrow containers (profile tab); 2-up grid otherwise. */
  compact?: boolean;
}

/** The signed-in bookmark grid (loading/error/empty states included) —
 * shared by BookmarksPage and the /profile Bookmarks tab. */
export function BookmarkList({ compact = false }: BookmarkListProps) {
  const { isDark, t, user } = useApp();
  const { bookmarks, isLoading, isError, remove } = useBookmarks();
  const loading = Boolean(user) && isLoading;

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mr-3" />
        {t.loading}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`p-4 rounded-lg flex items-start gap-3 ${isDark ? 'bg-red-900/30 border border-red-700/50 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
        <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
        <p className="font-semibold">Error loading bookmarks</p>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className={`text-center py-16 px-6 rounded-2xl ${isDark ? 'bg-slate-900/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
        <Bookmark size={48} className={`mx-auto mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
          No bookmarks yet
        </h2>
        <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Start bookmarking articles to keep them organized and easy to find
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-semibold hover:from-cyan-600 hover:to-pink-600 transition-all"
        >
          Explore Articles
        </Link>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-6 ${compact ? '' : 'sm:grid-cols-2'}`}>
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className={`rounded-2xl overflow-hidden border shadow-md hover:shadow-lg transition-all flex flex-col ${isDark ? 'bg-slate-800/80 border-slate-700/50 backdrop-blur-md hover:border-slate-500' : 'bg-white/85 border-white/60 backdrop-blur-md hover:border-cyan-200'}`}
        >
          {bookmark.url_to_image && (
            <div className="relative h-40 overflow-hidden">
              <img
                src={bookmark.url_to_image}
                alt={bookmark.article_title || 'Article'}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}

          <div className="flex flex-col flex-1 p-4">
            {bookmark.topic && (
              <div className={`inline-flex items-center gap-2 mb-2 w-fit px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
                {bookmark.topic}
              </div>
            )}

            <h3 className={`font-poppins font-semibold leading-snug mb-3 line-clamp-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
              {bookmark.article_title || 'Untitled'}
            </h3>

            <div className={`flex items-center justify-between gap-2 mt-auto pt-3 border-t ${isDark ? 'border-slate-700 text-slate-400' : 'border-gray-200 text-gray-500'}`}>
              <div className="flex items-center gap-1 text-xs flex-1 min-w-0">
                {bookmark.source_name && <span className="truncate font-medium">{bookmark.source_name}</span>}
              </div>

              <div className="flex items-center gap-2">
                {bookmark.article_url && (
                  <a
                    href={bookmark.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-2 py-1 rounded text-xs font-semibold transition ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  >
                    Read
                  </a>
                )}
                <button
                  onClick={() => remove.mutate(bookmark.id)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
