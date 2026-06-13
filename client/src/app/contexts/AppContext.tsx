import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Language, translations, Translations } from '../i18n/translations';
import { Category } from '../constants';
import { User, authService } from '../services/authService';
import { AUTH_UNAUTHORIZED_EVENT } from '../lib/apiFetch';
import type { SentimentType } from '../types/sentiment';

// UI + identity state only. Server state (articles, bookmarks, quotes,
// preferences) lives in React Query hooks — see hooks/.
interface AppContextType {
  // Theme
  isDark: boolean;
  toggleTheme: () => void;
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  // Translate (true = translate all content into selected language)
  translateMode: boolean;
  setTranslateMode: (v: boolean) => void;
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  // Category filter
  selectedCategory: Category | 'all';
  setSelectedCategory: (cat: Category | 'all') => void;
  // Source filter (e.g. ['cnn', 'bbc', 'aljazeera', 'yahoo_tw'])
  selectedSources: string[];
  setSelectedSources: (s: string[]) => void;
  // Sentiment filter (positive | neutral | negative | 'all')
  selectedSentiment: SentimentType | 'all';
  setSelectedSentiment: (s: SentimentType | 'all') => void;
  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  // Avatar (user-set profile picture, persisted per-account in localStorage)
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  avatarSrc: string; // effective src: custom avatar, else generated fallback
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('isDark') === 'true');
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem('language') as Language) || 'en'
  );
  const [translateMode, setTranslateMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedSentiment, setSelectedSentiment] = useState<SentimentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('isDark', String(isDark));
  }, [isDark]);

  // Persist the selected language so it survives reloads
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Load user from localStorage on mount, then validate the token against
  // /api/account/me — a stale/revoked token signs out via the 401 event, a
  // valid one refreshes the profile (username/avatar) from the server.
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Error loading user from localStorage:', err);
      }
    }
    if (!localStorage.getItem('authToken')) return;
    authService.me()
      .then((res) => {
        if (res.success && res.user) {
          setUser(res.user);
          authService.setUser(res.user);
        }
      })
      // accountFetch resolves {success:false} on its own failures; this catch
      // is defense-in-depth so boot-time validation can never reject unhandled.
      .catch(() => {});
  }, []);

  // One-time migration: avatars used to live only in this browser's
  // localStorage; push the local copy to the server once, then drop it.
  useEffect(() => {
    if (!user) return;
    const key = `avatar:${user.email}`;
    const local = localStorage.getItem(key);
    if (!local || user.avatar) {
      if (local && user.avatar) localStorage.removeItem(key);
      return;
    }
    authService.updateAvatar(local).then((res) => {
      if (res.success) {
        localStorage.removeItem(key);
        setUser((prev) => (prev ? { ...prev, avatar: res.avatar ?? local } : prev));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Expired/revoked token detected by apiFetch -> drop the in-memory user.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // Load the saved avatar for whichever account is signed in (keyed by email so
  // switching accounts on the same browser doesn't leak avatars between them).
  useEffect(() => {
    setAvatarUrlState(user ? localStorage.getItem(`avatar:${user.email}`) : null);
  }, [user]);

  const setAvatarUrl = (url: string | null) => {
    setAvatarUrlState(url);
    if (!user) return;
    const key = `avatar:${user.email}`;
    if (url) localStorage.setItem(key, url);
    else localStorage.removeItem(key);
  };

  const toggleTheme = () => setIsDark((prev) => !prev);
  const t = translations[language];
  const isAuthenticated = !!user;
  // Server-stored avatar wins; the localStorage copy only bridges the
  // one-time migration; dicebear is the generated fallback.
  const avatarSrc =
    user?.avatar ||
    avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.username || 'NewsAgg2026')}`;

  const value = useMemo<AppContextType>(
    () => ({
      isDark,
      toggleTheme,
      language,
      setLanguage,
      t,
      translateMode,
      setTranslateMode,
      sidebarOpen,
      setSidebarOpen,
      selectedCategory,
      setSelectedCategory,
      selectedSources,
      setSelectedSources,
      selectedSentiment,
      setSelectedSentiment,
      searchQuery,
      setSearchQuery,
      user,
      isAuthenticated,
      setUser,
      avatarUrl,
      setAvatarUrl,
      avatarSrc,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isDark,
      language,
      t,
      translateMode,
      sidebarOpen,
      selectedCategory,
      selectedSources,
      selectedSentiment,
      searchQuery,
      user,
      isAuthenticated,
      avatarUrl,
      avatarSrc,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
