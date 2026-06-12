import { Link } from 'react-router';
import { Sun, Moon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { SearchBox } from './SearchBox';

/** Mobile top bar (hidden ≥md): brand, search and theme toggle. Filters live
 * in the FeedHeader; navigation lives in the BottomTabBar. */
export function TopBar() {
  const { isDark, toggleTheme } = useApp();

  return (
    <div
      className={`md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-2.5 border-b backdrop-blur-xl
        ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}
    >
      <Link to="/" className="shrink-0">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center font-poppins font-bold text-white"
          style={{ background: 'var(--brand-grad, #06b6d4)' }}
        >
          N
        </span>
      </Link>
      <div className="flex-1 min-w-0">
        <SearchBox />
      </div>
      <button
        onClick={toggleTheme}
        className={`shrink-0 p-2 rounded-full ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}
