import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, LogIn, LogOut, Bookmark, Settings, Sun, Moon, ChevronLeft, ChevronRight, Languages, Check, Camera, Trash2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { GoogleLogin } from '@react-oauth/google';
import { useApp } from '../contexts/AppContext';
import { authService } from '../services/authService';
import type { Language } from '../i18n/translations';

const LANG_BADGE: Record<Language, string> = { en: 'EN', id: 'ID', zhCN: '简', zhTW: '繁' };

export function ProfileSidebar() {
  const {
    sidebarOpen, setSidebarOpen, isDark, toggleTheme, t, user, setUser, bookmarks,
    language, setLanguage, translateMode, setTranslateMode,
    avatarSrc, avatarUrl, setAvatarUrl,
  } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState('');
  const [mode, setMode] = useState<'menu' | 'login' | 'signup' | 'settings'>('menu');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingGoogleSignup, setPendingGoogleSignup] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setError('');

      // Send credential to backend
      const result = await authService.loginWithGoogle(credentialResponse.credential);

      if (result.success && result.user && result.token) {
        authService.setToken(result.token);
        authService.setUser(result.user);
        setUser(result.user);
        setMode('menu');
        setError('');
      } else if (result.error?.includes('not found')) {
        // User doesn't exist - show signup
        setPendingGoogleSignup(true);
        setEmail(result.email || '');
        setUsername(result.username || '');
        setMode('signup');
        setError('Please complete your signup with a password');
      } else {
        setError(result.error || 'Google login failed');
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    const result = await authService.login(email, password);
    
    if (result.success && result.user && result.token) {
      authService.setToken(result.token);
      authService.setUser(result.user);
      setUser(result.user);
      setMode('menu');
      setEmail('');
      setPassword('');
    } else {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!email || !username || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    const result = await authService.register(email, username, password);
    
    if (result.success && result.user && result.token) {
      authService.setToken(result.token);
      authService.setUser(result.user);
      setUser(result.user);
      setMode('menu');
      setEmail('');
      setUsername('');
      setPassword('');
    } else {
      setError(result.error || 'Signup failed');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setMode('menu');
  };

  const goTo = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  // Read an image file, downscale it to a 256×256 cover-cropped square, and
  // store the result as a data URL. Downscaling keeps localStorage small and
  // avoids persisting multi-MB originals.
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError('');
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setAvatarUrl(String(reader.result));
          return;
        }
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        setAvatarUrl(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => setAvatarError('Could not read that image');
      img.src = String(reader.result);
    };
    reader.onerror = () => setAvatarError('Could not read that file');
    reader.readAsDataURL(file);
  };

  const menuItems = [
    { icon: Bookmark, label: t.bookmarks, action: () => goTo('/bookmarks'), chevron: true },
    { icon: Settings, label: t.settings, action: () => setMode('settings'), chevron: true },
  ];

  const languageOptions: { code: Language; label: string }[] = [
    { code: 'en', label: t.english },
    { code: 'id', label: t.bahasa },
    { code: 'zhCN', label: t.zhSimplified },
    { code: 'zhTW', label: t.zhTraditional },
  ];

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className={`fixed left-0 top-0 bottom-0 z-[70] w-72 flex flex-col shadow-2xl ${isDark ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-gray-100'}`}
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

            {/* Profile section — social-media style cover + avatar */}
            <div className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              {user ? (
                <div>
                  {/* Cover banner */}
                  <div className="h-20 bg-gradient-to-r from-cyan-500 via-blue-500 to-pink-500 relative" />
                  <div className="px-5 pb-5 -mt-9">
                    {/* Avatar overlapping the banner — click camera to upload */}
                    <div className="relative w-[72px] h-[72px]">
                      <div className={`w-full h-full rounded-2xl overflow-hidden ring-4 ${isDark ? 'ring-slate-900' : 'ring-white'}`}>
                        <img
                          src={avatarSrc}
                          alt="Avatar"
                          className="w-full h-full object-cover bg-gradient-to-br from-cyan-400 to-pink-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label={t.changePhoto}
                        title={t.changePhoto}
                        className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md ring-2 transition-colors ${isDark ? 'bg-cyan-500 text-white ring-slate-900 hover:bg-cyan-400' : 'bg-cyan-500 text-white ring-white hover:bg-cyan-600'}`}
                      >
                        <Camera size={14} />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFile}
                        className="hidden"
                      />
                    </div>
                    {avatarError && (
                      <p className="mt-2 text-xs text-rose-500">{avatarError}</p>
                    )}
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl(null)}
                        className={`mt-2 inline-flex items-center gap-1 text-xs font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-rose-400' : 'text-gray-500 hover:text-rose-500'}`}
                      >
                        <Trash2 size={12} />{t.removePhoto}
                      </button>
                    )}
                    <div className="mt-2">
                      <p className={`font-poppins font-bold text-lg leading-tight ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{user.username}</p>
                      <p className={`text-sm truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{user.email}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <span className="text-xs text-emerald-500 font-medium">Signed in</span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className={`mt-4 grid grid-cols-2 gap-2 rounded-2xl p-1 ${isDark ? 'bg-slate-800/60' : 'bg-gray-50'}`}>
                      <button
                        onClick={() => goTo('/bookmarks')}
                        className={`flex flex-col items-center py-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700/60' : 'hover:bg-white'}`}
                      >
                        <span className={`font-poppins font-bold text-lg ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{bookmarks.length}</span>
                        <span className={`text-[11px] uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.bookmarks}</span>
                      </button>
                      <div className={`flex flex-col items-center py-2.5 rounded-xl`}>
                        <span className={`font-poppins font-bold text-lg ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{LANG_BADGE[language]}</span>
                        <span className={`text-[11px] uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.language}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <button
                    onClick={() => { setMode('login'); setError(''); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all"
                  >
                    <LogIn size={16} />
                    {t.signIn || 'Sign In'}
                  </button>
                </div>
              )}
            </div>

            {/* Navigation / Auth Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {user && mode === 'menu' && (
                <>
                  {/* Menu items */}
                  <nav className="space-y-1">
                    {menuItems.map(item => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:translate-x-1 ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                          <item.icon size={16} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
                        </div>
                        <span className="font-sans font-medium flex-1">{item.label}</span>
                        {item.chevron && <ChevronRight size={16} className={isDark ? 'text-slate-500' : 'text-gray-400'} />}
                      </button>
                    ))}
                  </nav>
                </>
              )}

              {/* Settings view */}
              {user && mode === 'settings' && (
                <>
                  <button
                    onClick={() => setMode('menu')}
                    className={`flex items-center gap-1.5 mb-4 text-sm font-medium transition-colors ${isDark ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <ChevronLeft size={16} />{t.settings}
                  </button>

                  {/* Appearance */}
                  <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t.appearance}</p>
                  <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-5 transition-colors ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                        {isDark ? <Moon size={16} className="text-cyan-400" /> : <Sun size={16} className="text-yellow-500" />}
                      </div>
                      <span className="font-medium">{isDark ? t.darkMode : t.lightMode}</span>
                    </div>
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-cyan-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isDark ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>

                  {/* Language */}
                  <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t.language}</p>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {languageOptions.map(opt => {
                      const active = language === opt.code;
                      return (
                        <button
                          key={opt.code}
                          onClick={() => setLanguage(opt.code)}
                          className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-cyan-500 text-white' : isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {active && <Check size={14} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Auto-translate toggle */}
                  <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t.translateAll}</p>
                  <button
                    onClick={() => setTranslateMode(!translateMode)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                        <Languages size={16} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
                      </div>
                      <span className="font-medium">{t.translateAll}</span>
                    </div>
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${translateMode ? 'bg-cyan-500' : isDark ? 'bg-slate-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${translateMode ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>
                </>
              )}

              {/* Login Form */}
              {mode === 'login' && !user && (
                <>
                  <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Sign In</h3>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`w-full px-4 py-3 rounded-xl border transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'} focus:outline-none`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 rounded-xl border transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'} focus:outline-none`}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                  >
                    <LogIn size={18} />
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>

                  {/* Google Login Button */}
                  <div className="mb-4">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Google login failed')}
                      theme={isDark ? 'filled_black' : 'outline'}
                      size="large"
                      width="100%"
                      text="signin_with"
                    />
                  </div>

                  <div className="text-center">
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-2`}>
                      Don't have an account?
                    </p>
                    <button
                      onClick={() => {
                        setMode('signup');
                        setError('');
                      }}
                      className={`text-sm font-medium transition ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
                    >
                      Create one
                    </button>
                  </div>
                </>
              )}

              {/* Signup Form */}
              {mode === 'signup' && !user && (
                <>
                  <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Create Account</h3>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="your username"
                        className={`w-full px-4 py-3 rounded-xl border transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'} focus:outline-none`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`w-full px-4 py-3 rounded-xl border transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'} focus:outline-none`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 rounded-xl border transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'} focus:outline-none`}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSignup}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                  >
                    <UserPlus size={18} />
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>

                  {/* Google Signup Button */}
                  {!pendingGoogleSignup && (
                    <div className="mb-4">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google signup failed')}
                        theme={isDark ? 'filled_black' : 'outline'}
                        size="large"
                        width="100%"
                        text="signup_with"
                      />
                    </div>
                  )}

                  <div className="text-center">
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-2`}>
                      Already have an account?
                    </p>
                    <button
                      onClick={() => {
                        setMode('login');
                        setError('');
                        setPendingGoogleSignup(false);
                      }}
                      className={`text-sm font-medium transition ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
                    >
                      Sign in
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Logout Button */}
            {user && mode === 'menu' && (
              <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-semibold transition-all ${isDark ? 'bg-red-900/30 text-red-300 border border-red-700/50 hover:bg-red-900/40' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'}`}
                >
                  <LogOut size={18} />
                  {t.signOut}
                </button>
              </div>
            )}

            {/* Bottom: Theme Toggle */}
            <div className={`p-5 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-gray-50 text-gray-700'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    {isDark ? <Moon size={16} className="text-cyan-400" /> : <Sun size={16} className="text-yellow-500" />}
                  </div>
                  <span className="font-medium">{isDark ? t.darkMode : t.lightMode}</span>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-cyan-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isDark ? 'left-6' : 'left-1'}`} />
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}