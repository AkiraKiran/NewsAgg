import type { NewsArticle } from '../types/article';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Bookmark {
  id: number;
  user_id: number;
  article_id: string;
  article_title: string | null;
  article_url: string | null;
  url_to_image: string | null;
  source_name: string | null;
  topic: string | null;
  created_at: string;
}

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
});

export const bookmarkService = {
  addBookmark: async (article: NewsArticle) => {
    try {
      const res = await fetch(`${API_BASE}/bookmarks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          articleId: article.id || article.url,
          articleTitle: article.title,
          articleUrl: article.url,
          urlToImage: article.urlToImage,
          sourceName: article.source.name,
          topic: article.topic
        })
      });
      return res.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  getBookmarks: async (): Promise<Bookmark[]> => {
    try {
      const res = await fetch(`${API_BASE}/bookmarks`, {
        headers: getHeaders()
      });
      const data = await res.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return [];
    }
  },

  removeBookmark: async (bookmarkId: number) => {
    try {
      const res = await fetch(`${API_BASE}/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  checkIfBookmarked: async (articleId: string) => {
    try {
      const res = await fetch(`${API_BASE}/bookmarks/check/${encodeURIComponent(articleId)}`, {
        headers: getHeaders()
      });
      return res.json();
    } catch (error) {
      return { success: false, isBookmarked: false };
    }
  }
};
