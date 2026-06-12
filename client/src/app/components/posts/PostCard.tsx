import { Heart, Trash2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { usePostMutations, type PostItem } from '../../hooks/usePosts';
import { EmbeddedArticleCard } from './EmbeddedArticleCard';

interface PostCardProps {
  post: PostItem;
}

const formatRelativeTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (diffMinutes <= 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.round(diffHours / 24)}d`;
};

/** One user post: author row, ≤280-char text, optional attached article,
 * optimistic like and delete-own. */
export function PostCard({ post }: PostCardProps) {
  const { t, isDark, user, isAuthenticated, setSidebarOpen } = useApp();
  const { toggleLike, removePost } = usePostMutations();

  const isOwn = user?.id === post.user_id;
  const avatar =
    post.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(post.username)}`;

  const handleLike = () => {
    if (!isAuthenticated) {
      setSidebarOpen(true);
      return;
    }
    toggleLike.mutate({ postId: post.id, liked: post.liked_by_me });
  };

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <img src={avatar} alt={post.username} className="w-9 h-9 rounded-full object-cover bg-slate-300" />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {post.username}
          </p>
          <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {formatRelativeTime(post.created_at)}
          </p>
        </div>
        {isOwn && (
          <button
            onClick={() => removePost.mutate(post.id)}
            disabled={removePost.isPending}
            aria-label={t.deletePost}
            title={t.deletePost}
            className={`p-1.5 rounded-full transition-colors disabled:opacity-50 ${
              isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100'
            }`}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
        {post.content}
      </p>

      {post.article_id && (
        <EmbeddedArticleCard
          articleId={post.article_id}
          title={post.article_title}
          image={post.article_image}
          topic={post.article_topic}
          sourceName={post.source_name}
        />
      )}

      <div className="flex items-center gap-1 mt-2.5">
        <button
          onClick={handleLike}
          aria-pressed={post.liked_by_me}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
            post.liked_by_me
              ? 'text-rose-500 bg-rose-500/10'
              : isDark
                ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                : 'text-slate-500 hover:text-rose-500 hover:bg-slate-100'
          }`}
        >
          <Heart size={14} fill={post.liked_by_me ? 'currentColor' : 'none'} />
          {post.like_count > 0 && <span className="tabular-nums">{post.like_count}</span>}
        </button>
      </div>
    </article>
  );
}
