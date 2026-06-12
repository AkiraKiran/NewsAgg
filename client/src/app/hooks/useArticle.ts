import { useQuery } from '@tanstack/react-query';
import { fetchArticleById } from '../services/newsAPI';

/** One full article by id — hits GET /api/articles/:id so a hard refresh on an
 * article page no longer pulls the whole legacy dataset. */
export function useArticle(articleId: string | undefined) {
  return useQuery({
    queryKey: ['article', articleId],
    queryFn: () => fetchArticleById(articleId!),
    enabled: Boolean(articleId),
  });
}
