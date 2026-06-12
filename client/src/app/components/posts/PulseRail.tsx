import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PenSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../../contexts/AppContext';
import { POSTS_ENABLED } from '../../constants';
import { fetchDailyQuote, fetchQuoteList } from '../../services/quoteService';
import { usePosts } from '../../hooks/usePosts';
import { QuoteCard } from './QuoteCard';
import { PostCard } from './PostCard';

const RAIL_QUOTES = 8;
const RAIL_POSTS = 12;

/** "Posts beside the news": quote of the day pinned on top, then a feed that
 * interleaves user posts with FavQs quotes (every 5th slot is a quote). With
 * no posts yet the feed degrades to a quotes-only list. */
export function PulseRail() {
  const { t, isDark, isAuthenticated, setSidebarOpen } = useApp();

  const { data: daily } = useQuery({
    queryKey: ['quote', 'daily'],
    queryFn: fetchDailyQuote,
    staleTime: 60 * 60 * 1000,
  });
  const { data: quoteList = [] } = useQuery({
    queryKey: ['quote', 'list'],
    queryFn: fetchQuoteList,
    staleTime: 60 * 60 * 1000,
  });
  const { data: postsData } = usePosts({ pageSize: RAIL_POSTS });
  const railPosts = POSTS_ENABLED ? (postsData?.pages[0]?.posts ?? []) : [];
  const postCards: ReactNode[] = railPosts.map((post) => (
    <PostCard key={`p-${post.id}`} post={post} />
  ));

  // Deterministic interleave: after every 4 posts comes 1 quote, drawn
  // round-robin from the daily batch. With no posts yet the feed degrades to
  // a clean quotes-only list.
  const items: ReactNode[] = [];
  if (postCards.length > 0) {
    let quoteIdx = 0;
    let postIdx = 0;
    const total = postCards.length + Math.ceil(postCards.length / 4);
    for (let i = 0; i < total; i += 1) {
      if (i % 5 === 4 && quoteList.length > 0) {
        const q = quoteList[quoteIdx % quoteList.length];
        items.push(<QuoteCard key={`q-${i}`} quote={q} />);
        quoteIdx += 1;
      } else if (postIdx < postCards.length) {
        items.push(postCards[postIdx]);
        postIdx += 1;
      }
    }
  } else {
    quoteList.slice(0, RAIL_QUOTES).forEach((q, i) => {
      items.push(<QuoteCard key={`q-${i}`} quote={q} />);
    });
  }

  const teaserClasses = `w-full flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm text-left transition-colors ${
    isDark
      ? 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
  }`;

  return (
    <div className="flex flex-col gap-3">
      {daily && <QuoteCard quote={daily} pinned />}

      {POSTS_ENABLED ? (
        isAuthenticated ? (
          <Link to="/posts?compose=1" className={teaserClasses}>
            <PenSquare size={16} className="shrink-0 text-[var(--brand,#06b6d4)]" />
            {t.whatsHappening}
          </Link>
        ) : (
          <button onClick={() => setSidebarOpen(true)} className={teaserClasses}>
            <PenSquare size={16} className="shrink-0 text-[var(--brand,#06b6d4)]" />
            {t.signInToPost}
          </button>
        )
      ) : (
        <div className={`${teaserClasses} cursor-default opacity-70`}>
          <PenSquare size={16} className="shrink-0" />
          {t.postsComingSoon}
        </div>
      )}

      {items}

      {POSTS_ENABLED && (
        <Link
          to="/posts"
          className="text-sm font-medium px-2 py-1 text-[var(--brand,#06b6d4)] hover:underline"
        >
          {t.viewAllPosts}
        </Link>
      )}
    </div>
  );
}
