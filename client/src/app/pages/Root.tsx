import { Outlet } from 'react-router';
import { useApp } from '../contexts/AppContext';
import { AppShell } from '../components/shell/AppShell';
import { ProfileSidebar } from '../components/ProfileSidebar';
import { ScrollToTop } from '../components/ScrollToTop';

export function Root() {
  const { isDark } = useApp();

  return (
    <div
      className={`min-h-screen font-sans ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
      style={{
        // Brand background: subtle cyan/pink (light) and cyan/violet (dark)
        // radial blobs over the base surface — the old NewsAgg identity.
        background: isDark
          ? 'radial-gradient(ellipse at 10% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 85% 15%, rgba(139, 92, 246, 0.10) 0%, transparent 50%), #0a0f1e'
          : 'radial-gradient(ellipse at 10% 15%, rgba(6, 182, 212, 0.18) 0%, transparent 45%), radial-gradient(ellipse at 85% 10%, rgba(236, 72, 153, 0.12) 0%, transparent 45%), #f0fafb',
        backgroundAttachment: 'fixed',
      }}
    >
      <AppShell>
        <Outlet />
      </AppShell>

      {/* Global overlays */}
      <ProfileSidebar />
      <ScrollToTop />
    </div>
  );
}
