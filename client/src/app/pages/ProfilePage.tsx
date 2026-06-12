import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../contexts/AppContext';
import { authService } from '../services/authService';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { AccountSettings } from '../components/profile/AccountSettings';
import { ProfileTabs } from '../components/profile/ProfileTabs';

/** X-style account page: banner + avatar header, account settings and the
 * [My Posts | Bookmarks] tabs. Guarded: signed-out visitors are bounced home
 * with the auth drawer opened. */
export function ProfilePage() {
  const { isDark, user, setUser, setSidebarOpen } = useApp();
  const navigate = useNavigate();

  // Guard + token validation: /me on mount refreshes the profile from the
  // server; a 401 fires the global sign-out, which re-triggers this guard.
  useEffect(() => {
    if (!user) {
      navigate('/');
      setSidebarOpen(true);
      return;
    }
    authService.me().then((res) => {
      if (res.success && res.user) {
        setUser(res.user);
        authService.setUser(res.user);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(user)]);

  if (!user) return null;

  return (
    <div className="px-4 md:px-6 py-6 space-y-4 max-w-3xl mx-auto">
      <ProfileHeader isDark={isDark} />
      <AccountSettings isDark={isDark} />
      <ProfileTabs isDark={isDark} />
    </div>
  );
}
