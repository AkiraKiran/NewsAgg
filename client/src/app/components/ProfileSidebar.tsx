import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, LogIn, LogOut, Bookmark, Settings, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useApp } from '../contexts/AppContext';
import { authService } from '../services/authService';

export function ProfileSidebar() {
  const { sidebarOpen, setSidebarOpen, isDark, toggleTheme, t, user, setUser, bookmarks } = useApp();
  const [mode, setMode] = useState<'menu' | 'login' | 'signup'>('menu');
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

  const menuItems = [
    { icon: Bookmark, label: t.bookmarks, action: () => {} },
    { icon: Settings, label: t.settings, action: () => {} },
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
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-500 to-pink-500 bg-clip-text text-transparent" style={{ fontFamily: 'Poppins, sans-serif' }}>
                NewsAgg
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile section */}
            <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-cyan-400">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover bg-gradient-to-br from-cyan-400 to-pink-400" 
                    />
                  </div>
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>{user.username}</p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      <span className="text-xs text-emerald-500 font-medium">Signed in</span>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setMode('login'); setError(''); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all"
                >
                  <LogIn size={16} />
                  Sign In
                </button>
              )}
            </div>

            {/* Navigation / Auth Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {user && mode === 'menu' && (
                <>
                  {/* Bookmarks stats */}
                  <div className={`mb-4 p-4 rounded-2xl flex items-center gap-3 ${isDark ? 'bg-blue-900/40 border border-blue-700/50' : 'bg-blue-50 border border-blue-200'}`}>
                    <Bookmark size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                    <div>
                      <p className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{bookmarks.length} Bookmarks</p>
                      <p className={`text-sm ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>Articles saved</p>
                    </div>
                  </div>

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
                        <span className="font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>{item.label}</span>
                      </button>
                    ))}
                  </nav>
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
                      theme={isDark ? 'dark' : 'light'}
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
                        theme={isDark ? 'dark' : 'light'}
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
                  Sign Out
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