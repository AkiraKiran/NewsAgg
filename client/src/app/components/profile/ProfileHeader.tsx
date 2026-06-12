import { CalendarDays, Clock3 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { AvatarEditor } from './AvatarEditor';

interface ProfileHeaderProps {
  isDark: boolean;
}

/** X-style profile header. The banner is a deterministic gradient derived
 * from the user id — no DB column needed, stable across sessions. */
const BANNERS = [
  'linear-gradient(110deg, #06b6d4 0%, #8b5cf6 55%, #ec4899 100%)',
  'linear-gradient(110deg, #0ea5e9 0%, #06b6d4 50%, #10b981 100%)',
  'linear-gradient(110deg, #ec4899 0%, #f59e0b 60%, #06b6d4 100%)',
  'linear-gradient(110deg, #8b5cf6 0%, #ec4899 55%, #f43f5e 100%)',
  'linear-gradient(110deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
  'linear-gradient(110deg, #10b981 0%, #06b6d4 55%, #ec4899 100%)',
];

const formatDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
};

export function ProfileHeader({ isDark }: ProfileHeaderProps) {
  const { t, user } = useApp();
  if (!user) return null;

  const banner = BANNERS[Math.abs(Number(user.id) || 0) % BANNERS.length];
  const joined = formatDate(user.created_at);
  const lastLogin = formatDate(user.last_login);

  return (
    <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="h-28 sm:h-36" style={{ background: banner }} />
      <div className="px-5 pb-5 -mt-12">
        <AvatarEditor isDark={isDark} />
        <div className="mt-3">
          <h1 className={`font-poppins text-2xl font-bold leading-tight ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            {user.username}
          </h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{user.email}</p>
          <div className={`flex flex-wrap items-center gap-4 mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {joined && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} />
                {t.memberSince} {joined}
              </span>
            )}
            {lastLogin && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} />
                {t.lastActive} {lastLogin}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
