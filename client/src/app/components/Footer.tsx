import { useApp } from '../contexts/AppContext';

export function Footer() {
  const { isDark } = useApp();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="border-t mt-8"
      style={{
        borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)',
        background: isDark
          ? 'radial-gradient(ellipse at 50% 100%, rgba(6, 182, 212, 0.05) 0%, transparent 50%), rgba(10, 15, 30, 0.6)'
          : 'radial-gradient(ellipse at 50% 100%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), rgba(240, 250, 251, 0.6)',
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

          {/* Sources */}
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: isDark ? 'rgba(226, 232, 240, 0.9)' : 'rgba(51, 65, 85, 0.9)' }}>
              News Sources
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: isDark ? 'rgba(226, 232, 240, 0.7)' : 'rgba(51, 65, 85, 0.7)' }}>
              <li><a href="https://www.cnn.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>CNN</a></li>
              <li><a href="https://www.bbc.com/news" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>BBC News</a></li>
              <li><a href="https://www.aljazeera.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>Al Jazeera</a></li>
              <li><a href="https://tw.news.yahoo.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>Yahoo News 台灣</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)' }} className="border-t my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs" style={{ color: isDark ? 'rgba(226, 232, 240, 0.6)' : 'rgba(51, 65, 85, 0.6)' }}>
          <p>© {currentYear} NewsAgg — Transformer-based sentiment analytics.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <span>Built with React · Tailwind · NeonDB</span>
            <span>Sentiment by RoBERTa</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
