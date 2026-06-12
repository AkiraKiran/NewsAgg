import { useApp } from '../contexts/AppContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { Link } from 'react-router';
import { Bookmark } from 'lucide-react';
import { BookmarkList } from '../components/profile/BookmarkList';

export function BookmarksPage() {
  const { user, isDark } = useApp();
  const { bookmarks } = useBookmarks();

  if (!user) {
    return (
      <div className="flex items-center justify-center px-6 py-24">
        <div className={`text-center max-w-md ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
          <Bookmark size={48} className="mx-auto mb-4 opacity-50" />
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            Sign in to view bookmarks
          </h1>
          <p className="mb-6">Create an account or sign in to save and organize your favorite articles.</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`font-poppins text-4xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            My Bookmarks
          </h1>
          <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            {bookmarks.length} {bookmarks.length === 1 ? 'article' : 'articles'} saved
          </p>
        </div>

        <BookmarkList />
      </div>
    </div>
  );
}
