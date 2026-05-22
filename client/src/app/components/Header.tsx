import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, X, Sun, Moon, ChevronDown, Globe, Menu, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../contexts/AppContext';
import { CATEGORIES, CATEGORY_LABELS, Category } from '../constants';
import { Language } from '../i18n/translations';

export function Header() {
  const { t, isDark, toggleTheme, language, setLanguage, setSidebarOpen, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, user, bookmarks } = useApp();
  const navigate = useNavigate();
  const [catOpen, setCatOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate('/');
    }
  };

  const languageOptions: { code: Language; label: string }[] = [
    { code: 'en', label: t.english },
    { code: 'id', label: t.bahasa },
    { code: 'zhCN', label: t.zhSimplified },
    { code: 'zhTW', label: t.zhTraditional },
  ];

  const catLabel = selectedCategory === 'all'
    ? t.allCategories
    : CATEGORY_LABELS[selectedCategory];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 md:px-6 gap-3 border-b backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-700/50' : 'bg-white/85 border-white/50'}`}>
      {/* Left: Avatar + Brand */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform hover:scale-105 active:scale-95 flex-shrink-0 ${isDark ? 'border-cyan-400' : 'border-cyan-500'}`}
          aria-label="Open profile"
        >
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=NewsAgg2026" alt="Avatar" className="w-full h-full object-cover bg-gradient-to-br from-cyan-400 to-pink-400" />
        </button>
        <Link to="/" className="flex-shrink-0">
          <span className="text-xl font-bold bg-gradient-to-r from-cyan-500 to-pink-500 bg-clip-text text-transparent" style={{ fontFamily: 'Poppins, sans-serif' }}>
            NewsAgg
          </span>
        </Link>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-xl mx-auto hidden md:block">
        <div className={`flex items-center gap-2 rounded-full px-4 py-2 border transition-all duration-200 focus-within:ring-2 focus-within:ring-cyan-400/50 ${isDark ? 'bg-slate-800/80 border-slate-600 text-slate-100' : 'bg-white/80 border-gray-200 text-gray-900'}`}>
          <Search size={16} className={isDark ? 'text-slate-400' : 'text-gray-400'} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder={t.searchPlaceholder}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery('')}
                className={`rounded-full p-0.5 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Category Dropdown */}
        <div ref={catRef} className="relative hidden md:block">
          <button
            onClick={() => { setCatOpen(p => !p); setLangOpen(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            {catLabel}
            <ChevronDown size={14} className={`transition-transform ${catOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {catOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-xl overflow-hidden z-50 max-h-[50vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-100'}`}
              >
                <button
                  onClick={() => { setSelectedCategory('all'); setCatOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === 'all' ? 'text-cyan-500 font-semibold' : isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {t.allCategories}
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setCatOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === cat ? 'text-cyan-500 font-semibold' : isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Language Switcher */}
        <div ref={langRef} className="relative hidden md:block">
          <button
            onClick={() => { setLangOpen(p => !p); setCatOpen(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Globe size={14} />
            {language === 'en' ? 'EN' : language === 'id' ? 'ID' : language === 'zhCN' ? '中文' : '繁中'}
            <ChevronDown size={14} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 top-full mt-2 w-44 rounded-xl border shadow-xl overflow-hidden z-50 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-100'}`}
              >
                {languageOptions.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => { setLanguage(opt.code); setLangOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${language === opt.code ? 'text-cyan-500 font-semibold' : isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bookmarks Link */}
        {user && (
          <Link
            to="/bookmarks"
            className={`relative p-2 rounded-lg transition-colors ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}`}
            title="View bookmarks"
          >
            <Bookmark size={18} />
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center">
                {bookmarks.length > 9 ? '9+' : bookmarks.length}
              </span>
            )}
          </Link>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`relative w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}
          aria-label="Toggle theme"
        >
          <motion.div
            animate={{ x: isDark ? 28 : 2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`absolute top-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${isDark ? 'bg-slate-900' : 'bg-white'}`}
          >
            {isDark
              ? <Moon size={11} className="text-cyan-400" />
              : <Sun size={11} className="text-yellow-500" />
            }
          </motion.div>
        </button>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(p => !p)}
          className={`md:hidden p-2 rounded-lg ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-16 left-0 right-0 border-b shadow-xl p-4 z-40 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'}`}
          >
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 border mb-3 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setSelectedCategory('all'); setMobileMenuOpen(false); }} className={`px-3 py-1.5 rounded-lg text-sm ${selectedCategory === 'all' ? 'bg-cyan-500 text-white' : isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-700'}`}>{t.allCategories}</button>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => { setSelectedCategory(cat as Category); setMobileMenuOpen(false); }} className={`px-3 py-1.5 rounded-lg text-sm ${selectedCategory === cat ? 'bg-cyan-500 text-white' : isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-700'}`}>
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
