import { useRef, useState, useEffect } from 'react';
import { NewsGrid } from '../components/NewsGrid';
import { SentimentPanel } from '../components/SentimentPanel';
import { useApp } from '../contexts/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';

export function Home() {
  const { isDark } = useApp();
  const newsColumnRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (newsColumnRef.current) {
        setShowBackToTop(newsColumnRef.current.scrollTop > 200);
      }
    };

    const column = newsColumnRef.current;
    if (column) {
      column.addEventListener('scroll', handleScroll, { passive: true });
      return () => column.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToTop = () => {
    newsColumnRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Main content - two column layout with independent scrolling */}
      <div className="flex gap-16 px-4 md:px-6 pt-6 md:pt-8 flex-1 min-h-0 max-w-[1600px] mx-auto w-full overflow-x-hidden">
        {/* News Grid - independent scrolling */}
        <div
          ref={newsColumnRef}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <div className="pb-50">
            <NewsGrid />
          </div>

          {/* Back to Top Button for News Column */}
          <AnimatePresence>
            {showBackToTop && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={scrollToTop}
                className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:shadow-xl hover:shadow-cyan-500/40 transition-shadow"
                aria-label="Back to top of news"
              >
                <ArrowUp size={20} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Sentiment Panel - independent scrolling on lg screens */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="pb-20">
            <SentimentPanel />
          </div>
        </div>
      </div>

      {/* Sentiment Panel - mobile view (below news grid) */}
      <div className="lg:hidden overflow-y-auto px-4 md:px-6 py-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <SentimentPanel />
      </div>
    </div>
  );
}
