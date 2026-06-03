import { Link } from 'react-router';
import { useApp } from '../contexts/AppContext';

export function NotFound() {
  const { isDark } = useApp();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="text-8xl mb-4">📰</div>
      <h1 className={`font-poppins text-4xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>404</h1>
      <p className={`text-lg mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Page not found</p>
      <Link to="/" className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg">
        Back to Home
      </Link>
    </div>
  );
}
