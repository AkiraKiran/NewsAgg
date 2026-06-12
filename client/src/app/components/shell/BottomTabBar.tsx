import { NavLink } from 'react-router';
import { Home, MessageSquareQuote, Bookmark } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { POSTS_ENABLED } from '../../constants';

/** Mobile bottom navigation (hidden ≥md, where NavRail takes over). The last
 * slot opens the profile drawer rather than navigating. */
export function BottomTabBar() {
  const { t, isDark, setSidebarOpen, avatarSrc } = useApp();

  const items = [
    { to: '/', icon: Home, label: t.home },
    ...(POSTS_ENABLED ? [{ to: '/posts', icon: MessageSquareQuote, label: t.posts }] : []),
    { to: '/bookmarks', icon: Bookmark, label: t.bookmarks },
  ];

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t backdrop-blur-xl
        ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t.menu}
    >
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          title={label}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-[var(--brand,#06b6d4)]'
                : isDark
                  ? 'text-slate-400'
                  : 'text-slate-500'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
      <button
        onClick={() => setSidebarOpen(true)}
        title={t.profile}
        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        <img src={avatarSrc} alt={t.profile} className="w-5 h-5 rounded-full object-cover bg-slate-300" />
        {t.profile}
      </button>
    </nav>
  );
}
