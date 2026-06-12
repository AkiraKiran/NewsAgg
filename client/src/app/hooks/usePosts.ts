import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useApp } from '../contexts/AppContext';
import { API_BASE_URL, AUTH_UNAUTHORIZED_EVENT } from '../lib/apiFetch';

export interface PostItem {
  id: number;
  content: string;
  created_at: string;
  article_id: string | null;
  user_id: number;
  username: string;
  avatar: string | null;
  article_title: string | null;
  article_image: string | null;
  article_topic: string | null;
  source_name: string | null;
  like_count: number;
  liked_by_me: boolean;
}

export interface PostsPage {
  posts: PostItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface PostsApiResponse {
  success: boolean;
  data?: PostsPage | PostItem;
  error?: string;
}

/** Like accountFetch: parses JSON bodies on 4xx so the server's error message
 * (281-char reject, rate limit, …) reaches the UI; 401 funnels into the
 * global sign-out event. */
async function postsFetch(path: string, init: RequestInit = {}): Promise<PostsApiResponse & { status: number }> {
  try {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.status === 401 && token) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    const json = (await res.json()) as PostsApiResponse;
    return { ...json, status: res.status };
  } catch (error) {
    return { success: false, error: String(error), status: 0 };
  }
}

const postsKey = (mine: boolean, userId: number | null) => ['posts', { mine, userId }];

/** Infinite public feed (or own posts with mine=true — requires sign-in). */
export function usePosts({ mine = false, pageSize = 20 }: { mine?: boolean; pageSize?: number } = {}) {
  const { user } = useApp();
  return useInfiniteQuery({
    queryKey: postsKey(mine, user?.id ?? null),
    queryFn: async ({ pageParam }) => {
      const sp = new URLSearchParams({ page: String(pageParam), pageSize: String(pageSize) });
      if (mine) sp.set('mine', '1');
      const res = await postsFetch(`/api/posts?${sp.toString()}`);
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load posts');
      return res.data as PostsPage;
    },
    initialPageParam: 1,
    getNextPageParam: (last: PostsPage) =>
      last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined,
    enabled: !mine || Boolean(user),
  });
}

type PostsCache = InfiniteData<PostsPage> | undefined;

/** Create / delete / like mutations. Like toggles optimistically across every
 * cached posts feed (home rail, /posts, profile tab). */
export function usePostMutations() {
  const { user } = useApp();
  const queryClient = useQueryClient();

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ['posts'] });

  const patchEverywhere = (patch: (post: PostItem) => PostItem) => {
    queryClient.setQueriesData<PostsCache>({ queryKey: ['posts'] }, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({ ...page, posts: page.posts.map(patch) })),
          }
        : old
    );
  };

  const create = useMutation({
    mutationFn: async ({ content, articleId }: { content: string; articleId?: string }) => {
      const res = await postsFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content, ...(articleId ? { articleId } : {}) }),
      });
      if (!res.success) throw new Error(res.error || `HTTP ${res.status}`);
      return res.data as PostItem;
    },
    onSuccess: invalidateAll,
  });

  const removePost = useMutation({
    mutationFn: async (postId: number) => {
      const res = await postsFetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (!res.success) throw new Error(res.error || `HTTP ${res.status}`);
    },
    onSuccess: invalidateAll,
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: number; liked: boolean }) => {
      const res = await postsFetch(`/api/posts/${postId}/like`, {
        method: liked ? 'DELETE' : 'POST',
      });
      if (!res.success) throw new Error(res.error || `HTTP ${res.status}`);
    },
    onMutate: async ({ postId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const snapshots = queryClient.getQueriesData<PostsCache>({ queryKey: ['posts'] });
      patchEverywhere((post) =>
        post.id === postId
          ? {
              ...post,
              liked_by_me: !liked,
              like_count: Math.max(0, post.like_count + (liked ? -1 : 1)),
            }
          : post
      );
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
  });

  return { create, removePost, toggleLike, canPost: Boolean(user) };
}
