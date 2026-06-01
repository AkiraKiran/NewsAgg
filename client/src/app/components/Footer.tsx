import { useApp } from '../contexts/AppContext';

interface FooterProps {
  isVisible?: boolean;
  onMouseLeave?: () => void;
}

export function Footer({ isVisible = true, onMouseLeave }: FooterProps) {
  const { isDark } = useApp();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 border-t transition-all duration-300 ease-out z-30"
      onMouseLeave={onMouseLeave}
      style={{
        borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)',
        background: isDark
          ? 'radial-gradient(ellipse at 50% 100%, rgba(6, 182, 212, 0.05) 0%, transparent 50%), rgba(10, 15, 30, 0.95)'
          : 'radial-gradient(ellipse at 50% 100%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), rgba(240, 250, 251, 0.95)',
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        backdropFilter: 'blur(10px)',
        maxHeight: '60vh',
        overflowY: 'auto',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: isDark ? '#00d9ff' : '#0891b2' }}>
              NewsAgg
            </h3>
            <p className="text-sm" style={{ color: isDark ? 'rgba(226, 232, 240, 0.7)' : 'rgba(51, 65, 85, 0.7)' }}>
              Your personalized news aggregation platform. Stay informed with curated headlines from around the world.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: isDark ? 'rgba(226, 232, 240, 0.9)' : 'rgba(51, 65, 85, 0.9)' }}>
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: isDark ? 'rgba(226, 232, 240, 0.7)' : 'rgba(51, 65, 85, 0.7)' }}>
              <li><a href="/" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>Home</a></li>
              <li><a href="/top-headlines" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>Top Headlines</a></li>
              <li><a href="/bookmarks" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>Bookmarks</a></li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: isDark ? 'rgba(226, 232, 240, 0.9)' : 'rgba(51, 65, 85, 0.9)' }}>
              Information
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: isDark ? 'rgba(226, 232, 240, 0.7)' : 'rgba(51, 65, 85, 0.7)' }}>
              <li><span className="hover:opacity-100 transition-opacity cursor-pointer" style={{ opacity: 0.7 }}></span></li>
              <li><span className="hover:opacity-100 transition-opacity cursor-pointer" style={{ opacity: 0.7 }}></span></li>
              <li><span className="hover:opacity-100 transition-opacity cursor-pointer" style={{ opacity: 0.7 }}></span></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)' }} className="border-t my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs" style={{ color: isDark ? 'rgba(226, 232, 240, 0.6)' : 'rgba(51, 65, 85, 0.6)' }}>
          <p>{currentYear} NewsAgg</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
