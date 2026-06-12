import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../contexts/AppContext';
import { apiFetch } from '../lib/apiFetch';
import type { Bookmark } from '../services/bookmarkService';
import type { NewsArticle } from '../types/article';
import { getArticleId } from '../services/newsAPI';

interface BookmarkListResponse {
  success: boolean;
  data?: Bookmark[];
}

interface BookmarkAddResponse {
  success: boolean;
  data?: Bookmark;
  error?: string;
}

/** Server-state bookmarks: one shared cache per signed-in user, optimistic
 * removal, and 401s funnelled through apiFetch's global sign-out. */
export function useBookmarks() {
  const { user, isAuthenticated } = useApp();
  const queryClient = useQueryClient();
  const queryKey = ['bookmarks', user?.id ?? null];

  const { data: bookmarks = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const json = await apiFetch<BookmarkListResponse>('/bookmarks');
      return json.success && json.data ? json.data : [];
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const add = useMutation({
    mutationFn: (article: NewsArticle) =>
      apiFetch<BookmarkAddResponse>('/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          articleId: getArticleId(article),
          articleTitle: article.title,
          articleUrl: article.url,
          urlToImage: article.urlToImage,
          sourceName: article.source.name,
          topic: article.topic,
        }),
      }),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData<Bookmark[]>(queryKey, (old = []) => [result.data!, ...old]);
      }
    },
  });

  const remove = useMutation({
    mutationFn: (bookmarkId: number) =>
      apiFetch<{ success: boolean }>(`/bookmarks/${bookmarkId}`, { method: 'DELETE' }),
    onMutate: async (bookmarkId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Bookmark[]>(queryKey);
      queryClient.setQueryData<Bookmark[]>(queryKey, (old = []) =>
        old.filter((b) => b.id !== bookmarkId)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  const isBookmarked = (articleId: string) =>
    bookmarks.some((b) => b.article_id === articleId);

  const bookmarkIdFor = (articleId: string) =>
    bookmarks.find((b) => b.article_id === articleId)?.id ?? null;

  return { bookmarks, isLoading, isError, add, remove, isBookmarked, bookmarkIdFor };
}
