import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, Translations } from '../i18n/translations';
import { Category } from '../constants';
import { User } from '../services/authService';
import { Bookmark, bookmarkService } from '../services/bookmarkService';
import { getRandomQuote } from '../services/newsAPI';
import type { DailyQuote } from '../types/api';
import type { SentimentType } from '../types/sentiment';
import { mem0Service } from '../services/mem0Service';

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
  avatarSrc: string;            // effective src: custom avatar, else generated fallback
  // Bookmarks
  bookmarks: Bookmark[];
  setBookmarks: (bookmarks: Bookmark[]) => void;
  isBookmarkedById: (articleId: string) => boolean;
  getBookmarkIdByArticleId: (articleId: string) => number | null;
  // Daily quote (FavQs via backend)
  quote: DailyQuote | null;
  // Personalization (Mem0)
  preferences: string[];
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
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  const [preferences, setPreferences] = useState<string[]>([]);

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

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Error loading user from localStorage:', err);
      }
    }
  }, []);

  // Load the daily quote once on mount
  useEffect(() => {
    getRandomQuote().then((q) => {
      if (q) setQuote(q);
    });
  }, []);

  // When the signed-in user changes, refresh their bookmarks + Mem0 preferences
  useEffect(() => {
    if (user) {
      bookmarkService.getBookmarks().then(setBookmarks);
      mem0Service.getUserPreferences().then(setPreferences);
    } else {
      setBookmarks([]);
      setPreferences([]);
    }
  }, [user]);

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

  const toggleTheme = () => setIsDark(prev => !prev);
  const t = translations[language];
  const isAuthenticated = !!user;
  const avatarSrc =
    avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.username || 'NewsAgg2026')}`;

  const isBookmarkedById = (articleId: string) =>
    bookmarks.some(b => b.article_id === articleId);

  const getBookmarkIdByArticleId = (articleId: string) => {
    const bookmark = bookmarks.find(b => b.article_id === articleId);
    return bookmark?.id || null;
  };

  return (
    <AppContext.Provider value={{
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
      bookmarks,
      setBookmarks,
      isBookmarkedById,
      getBookmarkIdByArticleId,
      quote,
      preferences,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
