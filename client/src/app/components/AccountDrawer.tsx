import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, LogIn, LogOut, Bookmark } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { authService } from '../services/authService';

export function AccountDrawer() {
  const { accountOpen, setAccountOpen, isDark, t, user, setUser, bookmarks } = useApp();
  const [mode, setMode] = useState<'view' | 'login' | 'signup'>('view');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setMode('view');
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
      setMode('view');
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
    setMode('view');
  };

  return (
    <AnimatePresence>
      {accountOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setAccountOpen(false)}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className={`fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-900 border-t border-slate-700' : 'bg-white border-t border-gray-100'}`}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sticky top-0">
              <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
            </div>

            {/* Close button */}
            <div className="flex items-center justify-between px-6 py-3 sticky top-4 z-10">
              <h2 className={`font-bold text-lg ${isDark ? 'text-slate-100' : 'text-gray-900'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                {user ? 'Account' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : t.account}
              </h2>
              <button
                onClick={() => setAccountOpen(false)}
                className={`p-2 rounded-xl ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-8">
              {/* Logged In View */}
              {user && mode === 'view' && (
                <>
                  <div className={`mb-6 p-4 rounded-2xl flex items-center gap-4 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-gray-50 border border-gray-100'}`}>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-cyan-400 flex-shrink-0">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover bg-gradient-to-br from-cyan-400 to-pink-400" 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{user.username}</p>
                      <p className={`text-sm truncate ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{user.email}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <span className="text-xs text-emerald-500 font-medium">Signed in</span>
                      </div>
                    </div>
                  </div>

                  <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${isDark ? 'bg-blue-900/40 border border-blue-700/50' : 'bg-blue-50 border border-blue-200'}`}>
                    <Bookmark size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                    <div>
                      <p className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{bookmarks.length} Bookmarks</p>
                      <p className={`text-sm ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>Articles saved for later</p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 ${isDark ? 'bg-red-900/30 text-red-300 border border-red-700/50 hover:bg-red-900/40' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'}`}
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </>
              )}

              {/* Login View */}
              {mode === 'login' && !user && (
                <>
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
                    className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogIn size={18} />
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>

                  <div className="mt-4 text-center">
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

              {/* Signup View */}
              {mode === 'signup' && !user && (
                <>
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
                    className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus size={18} />
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>

                  <div className="mt-4 text-center">
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-2`}>
                      Already have an account?
                    </p>
                    <button
                      onClick={() => {
                        setMode('login');
                        setError('');
                      }}
                      className={`text-sm font-medium transition ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
                    >
                      Sign in
                    </button>
                  </div>
                </>
              )}

              {/* Not logged in - Show options */}
              {!user && mode === 'view' && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setMode('signup');
                      setError('');
                    }}
                    className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <UserPlus size={18} />
                    {t.createAccount || 'Create Account'}
                  </button>
                  <button
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 ${isDark ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500' : 'bg-white text-gray-700 border border-gray-200 shadow-sm hover:border-gray-300'}`}
                  >
                    <LogIn size={18} />
                    {t.addAccount || 'Sign In'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}