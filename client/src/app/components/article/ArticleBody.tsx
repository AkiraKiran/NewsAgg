import { Sparkles } from 'lucide-react';
import { ImageWithFallback } from '../utils/ImageWithFallback';
import { VideoPlayer } from '../utils/VideoPlayer';
import type { NewsArticle } from '../../types/article';
import { bodyTextClass, mutedTextClass, panelBaseClass } from './helpers';

interface ArticleBodyProps {
  article: NewsArticle;
  isDark: boolean;
}

export function ArticleBody({ article, isDark }: ArticleBodyProps) {
  const panelBase = panelBaseClass(isDark);
  const mutedText = mutedTextClass(isDark);
  const bodyText = bodyTextClass(isDark);
  const galleryImages = article.images.filter((image) => image.url !== article.urlToImage).slice(0, 3);

  return (
    <>
      {article.description && <p className={`text-lg leading-relaxed mb-5 ${bodyText}`}>{article.description}</p>}
      {article.videoUrl && <VideoPlayer videoUrl={article.videoUrl} title={article.title} isDark={isDark} />}

      {article.aiSummary && (
        <div className={`rounded-2xl border p-5 mb-6 ${panelBase}`}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} className="text-cyan-500" />
            <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>AI Summary</h2>
          </div>
          <p className={`leading-relaxed ${bodyText}`}>{article.aiSummary}</p>
        </div>
      )}

      {galleryImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {galleryImages.map((image) => (
            <a key={image.url} href={image.url} target="_blank" rel="noopener noreferrer" className={`rounded-2xl overflow-hidden border block ${isDark ? 'border-slate-700/50 bg-slate-800/60' : 'border-gray-100 bg-white/70'}`}>
              <div className="aspect-[4/3] overflow-hidden">
                <ImageWithFallback src={image.url} alt={image.alt || article.title} className="w-full h-full object-cover" />
              </div>
              {image.caption && <p className={`px-3 py-2 text-xs leading-relaxed ${mutedText}`}>{image.caption}</p>}
            </a>
          ))}
        </div>
      )}

      <div className={`whitespace-pre-line leading-relaxed mb-8 ${bodyText}`} style={{ fontSize: '1rem', lineHeight: '1.8' }}>
        {article.content || 'No content provided.'}
      </div>
    </>
  );
}
