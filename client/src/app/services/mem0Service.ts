// Mem0-backed personalization. The backend derives the user from the JWT, so
// these calls only need the auth token. All methods fail soft (never throw) so
// personalization can never break the UI.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

export interface ReadingHistoryEntry {
  id: string;
  topic: string;
  sentiment: string;
  keywords?: string[];
}

export const mem0Service = {
  /** Returns the user's preferred topics inferred by Mem0 (empty if unavailable). */
  getUserPreferences: async (): Promise<string[]> => {
    try {
      const res = await fetch(`${API_BASE}/api/user/preferences`, {
        headers: getHeaders(),
      });
      const json = await res.json();
      return json?.success ? (json.data?.topics ?? []) : [];
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return [];
    }
  },

  /** Records that the user read an article so Mem0 can learn their interests. */
  saveReadingHistory: async (article: ReadingHistoryEntry): Promise<void> => {
    try {
      await fetch(`${API_BASE}/api/user/reading-history`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(article),
      });
    } catch (error) {
      console.error('Error saving reading history:', error);
    }
  },
};
