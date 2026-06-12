import { useState } from 'react';
import { Eye, EyeOff, Info, LogIn, UserPlus } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useApp } from '../../contexts/AppContext';
import { authService } from '../../services/authService';

interface AuthPanelProps {
  isDark: boolean;
  /** Called after a successful sign-in/sign-up (e.g. to flip the drawer back). */
  onAuthenticated?: () => void;
}

/** Email + Google sign-in/sign-up forms (moved verbatim out of the old
 * 585-line ProfileSidebar so the drawer stays slim). */
export function AuthPanel({ isDark, onAuthenticated }: AuthPanelProps) {
  const { t, setUser } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Informational guidance (e.g. "finish your Google signup") — rendered as a
  // calm info box, not an error, and cleared as soon as the user types.
  const [info, setInfo] = useState('');
  const [pendingGoogleSignup, setPendingGoogleSignup] = useState(false);

  const finish = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setError('');
    setInfo('');
    onAuthenticated?.();
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setError('');
      setInfo('');
      const result = await authService.loginWithGoogle(credentialResponse.credential);
      if (result.success && result.user && result.token) {
        authService.setToken(result.token);
        authService.setUser(result.user);
        setUser(result.user);
        finish();
      } else if (result.needsSignup) {
        // Account doesn't exist yet — pre-fill signup from the Google profile.
        setPendingGoogleSignup(true);
        setEmail(result.email || '');
        setUsername(result.username || '');
        setMode('signup');
        setInfo(t.googleCompleteSignup);
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
      finish();
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');
    const result = await authService.register(email, username, password);
    if (result.success && result.user && result.token) {
      authService.setToken(result.token);
      authService.setUser(result.user);
      setUser(result.user);
      finish();
    } else {
      setError(result.error || 'Signup failed');
    }
    setLoading(false);
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border transition ${
    isDark
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'
  } focus:outline-none`;
  const labelClass = `block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`;

  return (
    <div>
      <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </h3>

      <div className="space-y-4 mb-6">
        {mode === 'signup' && (
          <div>
            <label className={labelClass}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your username"
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (info) setInfo('');
              }}
              placeholder="••••••••"
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? t.hidePassword : t.showPassword}
              title={showPassword ? t.hidePassword : t.showPassword}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      {info && !error && (
        <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${isDark ? 'bg-cyan-900/30 text-cyan-200' : 'bg-cyan-50 text-cyan-800'}`}>
          <Info size={15} className="shrink-0 mt-0.5" />
          {info}
        </div>
      )}

      {error && (
        <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>
          {error}
        </div>
      )}

      <button
        onClick={mode === 'login' ? handleLogin : handleSignup}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-semibold hover:from-cyan-600 hover:to-pink-600 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
        {loading
          ? mode === 'login' ? 'Signing in...' : 'Creating account...'
          : mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>

      {!(mode === 'signup' && pendingGoogleSignup) && (
        <div className="mb-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError(mode === 'login' ? 'Google login failed' : 'Google signup failed')}
            theme={isDark ? 'filled_black' : 'outline'}
            size="large"
            width="100%"
            text={mode === 'login' ? 'signin_with' : 'signup_with'}
          />
        </div>
      )}

      <div className="text-center">
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-2`}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
        </p>
        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
            setInfo('');
            setPendingGoogleSignup(false);
          }}
          className={`text-sm font-medium transition ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
        >
          {mode === 'login' ? 'Create one' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
