import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';

/** Global search input (moved from the old Header into the right rail / top
 * bar). Typing filters the feed server-side via the debounced `q` param. */
export function SearchBox() {
  const { t, isDark, searchQuery, setSearchQuery } = useApp();
  const navigate = useNavigate();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) navigate('/');
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-4 py-2.5 border transition-all
        focus-within:ring-2 focus-within:ring-[var(--brand-ring,rgba(6,182,212,0.5))]
        ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
    >
      <Search size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t.searchPlaceholder}
        className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-slate-400 font-sans"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className={`rounded-full p-0.5 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
