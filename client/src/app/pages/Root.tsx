import { Outlet } from 'react-router';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/Header';
import { ProfileSidebar } from '../components/ProfileSidebar';
import { ScrollToTop } from '../components/ScrollToTop';
import { Footer } from '../components/Footer';
import { useState, useEffect } from 'react';

export function Root() {
  const { isDark } = useApp();
  const [showFooter, setShowFooter] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const distanceFromBottom = window.innerHeight - e.clientY;
      setShowFooter(distanceFromBottom < 120);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleFooterMouseLeave = () => {
    setShowFooter(false);
  };

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        fontFamily: 'Inter, sans-serif',
        background: isDark
          ? 'radial-gradient(ellipse at 10% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 85% 15%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 70%, rgba(59, 130, 246, 0.07) 0%, transparent 50%), #0a0f1e'
          : 'radial-gradient(ellipse at 10% 15%, rgba(6, 182, 212, 0.18) 0%, transparent 45%), radial-gradient(ellipse at 85% 10%, rgba(236, 72, 153, 0.12) 0%, transparent 45%), radial-gradient(ellipse at 55% 55%, rgba(132, 204, 22, 0.1) 0%, transparent 45%), radial-gradient(ellipse at 90% 85%, rgba(234, 179, 8, 0.12) 0%, transparent 45%), #f0fafb',
      }}
    >
      <Header />

      {/* Main content area with top padding for fixed header */}
      <main className="pt-16 min-h-screen">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer isVisible={showFooter} onMouseLeave={handleFooterMouseLeave} />

      {/* Global overlays */}
      <ProfileSidebar />
      <ScrollToTop />
    </div>
  );
}
