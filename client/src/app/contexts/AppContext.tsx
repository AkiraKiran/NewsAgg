import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, Translations } from '../i18n/translations';
import { Category } from '../constants';
import { User } from '../services/authService';
import { Bookmark } from '../services/bookmarkService';

interface AppContextType {
  // Theme
  isDark: boolean;
  toggleTheme: () => void;
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  // Account Drawer
  accountOpen: boolean;
  setAccountOpen: (open: boolean) => void;
  // Category filter
  selectedCategory: Category | 'all';
  setSelectedCategory: (cat: Category | 'all') => void;
  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  // Bookmarks
  bookmarks: Bookmark[];
  setBookmarks: (bookmarks: Bookmark[]) => void;
  isBookmarkedById: (articleId: string) => boolean;
  getBookmarkIdByArticleId: (articleId: string) => number | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

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

  const toggleTheme = () => setIsDark(prev => !prev);
  const t = translations[language];
  const isAuthenticated = !!user;
  
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
      sidebarOpen,
      setSidebarOpen,
      accountOpen,
      setAccountOpen,
      selectedCategory,
      setSelectedCategory,
      searchQuery,
      setSearchQuery,
      user,
      isAuthenticated,
      setUser,
      bookmarks,
      setBookmarks,
      isBookmarkedById,
      getBookmarkIdByArticleId,
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
