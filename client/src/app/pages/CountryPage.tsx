import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Globe } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { NewsCard } from '../components/NewsCard';
import { fetchArticlesPage } from '../services/newsAPI';
import { COUNTRIES, COUNTRY_SOURCE_MAP } from '../constants';

export function CountryPage() {
  const { iso } = useParams<{ iso: string }>();
  const { t, isDark } = useApp();

  const country = COUNTRIES.find(c => c.code === iso);
  const sources = COUNTRY_SOURCE_MAP[iso ?? ''] ?? [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['country-articles', iso],
    queryFn: () => fetchArticlesPage({ sources, pageSize: 50 }, 1),
    enabled: sources.length > 0,
  });

  const articles = sources.length > 0 ? data?.articles ?? [] : [];
  const loading = sources.length > 0 && isLoading;
  const error = isError ? t.fetchFailed : null;

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto">
        <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
          <div className="animate-spin text-3xl mb-4">⏳</div>
          <p className="text-lg font-medium">{t.loading || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto">
        <div className={`flex flex-col items-center justify-center py-20 text-center ${isDark ? 'text-red-400' : 'text-red-500'}`}>
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-lg font-medium">{t.errorTitle}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg">
          <Globe size={20} className="text-white" />
        </div>
        <div>
          <h1 className={`font-poppins font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            {country?.name || iso?.toUpperCase()} {t.newsLabel}
          </h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.filterByCountry}</p>
        </div>
      </motion.div>

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 gap-5">
          {articles.map((article, i) => (
            <NewsCard key={article.url} article={article} index={i} />
          ))}
        </div>
      ) : (
        <div className={`text-center py-20 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
          <div className="text-5xl mb-4">🌍</div>
          <p>{t.noResults}</p>
        </div>
      )}
    </div>
  );
}
