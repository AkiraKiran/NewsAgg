import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { POSTS_ENABLED } from '../../constants';
import { usePosts } from '../../hooks/usePosts';
import { PostCard } from '../posts/PostCard';
import { BookmarkList } from './BookmarkList';

interface ProfileTabsProps {
  isDark: boolean;
}

type TabKey = 'posts' | 'bookmarks';

/** [My Posts | Bookmarks] tabs on /profile. My Posts lights up with the F7
 * posts feature flag; until then Bookmarks is the only (default) tab. */
export function ProfileTabs({ isDark }: ProfileTabsProps) {
  const { t } = useApp();
  const [tab, setTab] = useState<TabKey>(POSTS_ENABLED ? 'posts' : 'bookmarks');
  const { data: mineData, isLoading: mineLoading } = usePosts({ mine: true, pageSize: 20 });
  const myPosts = mineData?.pages.flatMap((p) => p.posts) ?? [];

  const tabs: { key: TabKey; label: string }[] = [
    ...(POSTS_ENABLED ? [{ key: 'posts' as TabKey, label: t.myPosts }] : []),
    { key: 'bookmarks', label: t.bookmarks },
  ];

  return (
    <div>
      <div className={`flex gap-1 rounded-full border p-1 mb-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} role="tablist">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
              tab === key
                ? 'text-white'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
            }`}
            style={tab === key ? { background: 'var(--brand-grad, #06b6d4)' } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'bookmarks' && <BookmarkList compact />}
      {tab === 'posts' && POSTS_ENABLED && (
        mineLoading ? (
          <div className={`flex justify-center py-10 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-slate-600' : 'border-gray-300'}`} />
          </div>
        ) : myPosts.length === 0 ? (
          <p className={`text-sm py-8 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.noPostsYet}</p>
        ) : (
          <div className="space-y-3">
            {myPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
