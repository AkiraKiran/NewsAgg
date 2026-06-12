import { motion, AnimatePresence } from 'motion/react';
import { X, LogOut, Bookmark, Sun, Moon, Check, Languages, UserCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../contexts/AppContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { authService } from '../services/authService';
import { AuthPanel } from './profile/AuthPanel';
import type { Language } from '../i18n/translations';

/** Slim account drawer: identity card linking to /profile plus quick
 * settings rows. All account editing lives on the /profile page. */
export function ProfileSidebar() {
  const {
    sidebarOpen, setSidebarOpen, isDark, toggleTheme, t, user, setUser,
    language, setLanguage, translateMode, setTranslateMode, avatarSrc,
  } = useApp();
  const { bookmarks } = useBookmarks();
  const navigate = useNavigate();

  const goTo = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const languageOptions: { code: Language; label: string }[] = [
    { code: 'en', label: t.english },
    { code: 'id', label: t.bahasa },
    { code: 'zhCN', label: t.zhSimplified },
    { code: 'zhTW', label: t.zhTraditional },
  ];

  const rowClass = `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
    isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-50'
  }`;
  const iconBox = `w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`;

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className={`fixed left-0 top-0 bottom-0 z-[70] w-72 flex flex-col shadow-2xl ${
              isDark ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-gray-100'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <span className="font-poppins text-lg font-bold bg-gradient-to-r from-cyan-500 to-pink-500 bg-clip-text text-transparent">
                NewsAgg
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {user ? (
                <>
                  {/* Identity card → /profile */}
                  <button
                    onClick={() => goTo('/profile')}
                    className={`w-full flex items-center gap-3 p-3 mb-4 rounded-2xl text-left transition-colors ${
                      isDark ? 'bg-slate-800/70 hover:bg-slate-800' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <img src={avatarSrc} alt={user.username} className="w-12 h-12 rounded-xl object-cover bg-slate-300" />
                    <div className="flex-1 min-w-0">
                      <p className={`font-poppins font-bold leading-tight truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                        {user.username}
                      </p>
                      <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{user.email}</p>
                      <span className="text-xs font-medium text-cyan-500">{t.viewProfile}</span>
                    </div>
                    <ChevronRight size={16} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
                  </button>

                  {/* Quick rows */}
                  <nav className="space-y-1">
                    <button onClick={() => goTo('/profile')} className={rowClass}>
                      <div className={iconBox}><UserCircle size={16} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} /></div>
                      <span className="font-medium flex-1">{t.profile}</span>
                    </button>
                    <button onClick={() => goTo('/bookmarks')} className={rowClass}>
                      <div className={iconBox}><Bookmark size={16} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} /></div>
                      <span className="font-medium flex-1">{t.bookmarks}</span>
                      <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{bookmarks.length}</span>
                    </button>
                  </nav>
                </>
              ) : (
                <AuthPanel isDark={isDark} onAuthenticated={() => setSidebarOpen(false)} />
              )}

              {/* Appearance */}
              <p className={`mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {t.appearance}
              </p>
              <button onClick={toggleTheme} className={rowClass}>
                <div className={iconBox}>
                  {isDark ? <Moon size={16} className="text-cyan-400" /> : <Sun size={16} className="text-yellow-500" />}
                </div>
                <span className="font-medium flex-1">{isDark ? t.darkMode : t.lightMode}</span>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-cyan-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isDark ? 'left-6' : 'left-1'}`} />
                </div>
              </button>

              {/* Language */}
              <p className={`mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {t.language}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {languageOptions.map((opt) => {
                  const active = language === opt.code;
                  return (
                    <button
                      key={opt.code}
                      onClick={() => setLanguage(opt.code)}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'bg-cyan-500 text-white'
                          : isDark
                            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {active && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Auto-translate */}
              <button onClick={() => setTranslateMode(!translateMode)} className={`${rowClass} mt-4`}>
                <div className={iconBox}><Languages size={16} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} /></div>
                <span className="font-medium flex-1">{t.translateAll}</span>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${translateMode ? 'bg-cyan-500' : isDark ? 'bg-slate-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${translateMode ? 'left-6' : 'left-1'}`} />
                </div>
              </button>
            </div>

            {/* Sign out */}
            {user && (
              <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-semibold transition-all ${
                    isDark
                      ? 'bg-red-900/30 text-red-300 border border-red-700/50 hover:bg-red-900/40'
                      : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  }`}
                >
                  <LogOut size={18} />
                  {t.signOut}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
