import { Outlet, useLocation } from 'react-router';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/Header';
import { ProfileSidebar } from '../components/ProfileSidebar';
import { ScrollToTop } from '../components/ScrollToTop';
import { Footer } from '../components/Footer';

export function Root() {
  const { isDark } = useApp();
  const { pathname } = useLocation();
  // The article page is height-locked (its own internal scroll), so an in-flow
  // footer would sit off-screen there — skip it on that route.
  const hideFooter = pathname.startsWith('/article/');

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-hidden font-sans"
      style={{
        background: isDark
          ? 'radial-gradient(ellipse at 10% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 85% 15%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 70%, rgba(59, 130, 246, 0.07) 0%, transparent 50%), #0a0f1e'
          : 'radial-gradient(ellipse at 10% 15%, rgba(6, 182, 212, 0.18) 0%, transparent 45%), radial-gradient(ellipse at 85% 10%, rgba(236, 72, 153, 0.12) 0%, transparent 45%), radial-gradient(ellipse at 55% 55%, rgba(132, 204, 22, 0.1) 0%, transparent 45%), radial-gradient(ellipse at 90% 85%, rgba(234, 179, 8, 0.12) 0%, transparent 45%), #f0fafb',
      }}
    >
      <Header />

      {/* Main content area; flex-1 pushes the footer to the true bottom */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* Footer — static, in normal document flow */}
      {!hideFooter && <Footer />}

      {/* Global overlays */}
      <ProfileSidebar />
      <ScrollToTop />
    </div>
  );
}
