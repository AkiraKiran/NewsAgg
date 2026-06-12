import { useState } from 'react';
import { ExternalLink, PlayCircle, ChevronDown, Info } from 'lucide-react';
import type { NewsArticle } from '../../types/article';
import { useApp } from '../../contexts/AppContext';
import { panelBaseClass } from './helpers';

interface ArticleFooterProps {
  article: NewsArticle;
  isDark: boolean;
}

export function ArticleFooter({ article, isDark }: ArticleFooterProps) {
  const { t } = useApp();
  const panelBase = panelBaseClass(isDark);
  const [open, setOpen] = useState(false);

  const glossary: Array<{ term: string; desc: string }> = [
    { term: t.aiConfidenceTerm, desc: t.aiConfidenceDesc },
    { term: t.toxicityTerm, desc: t.toxicityDesc },
    { term: t.readingGradeTerm, desc: t.readingGradeDesc },
    { term: t.fleschTerm, desc: t.fleschDesc },
    { term: t.smogTerm, desc: t.smogDesc },
  ];

  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
  const headingText = isDark ? 'text-slate-100' : 'text-gray-900';

  return (
    <div className={`rounded-2xl border p-5 ${panelBase}`}>
      <p className={`text-sm mb-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Continue with the original coverage and any linked media from this source.</p>
      <div className="flex flex-wrap gap-3">
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all text-sm">
          <ExternalLink size={15} />Read on {article.source.name}
        </a>
        {article.videoUrl && (
          <a href={article.videoUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${isDark ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
            <PlayCircle size={15} />Watch video
          </a>
        )}
      </div>

      {/* Metric glossary + sentiment math (collapsible) */}
      <div className={`mt-5 pt-5 border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
        <button
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex items-center justify-between w-full text-left"
        >
          <span className={`flex items-center gap-2 font-poppins text-sm font-semibold ${headingText}`}>
            <Info size={14} className="text-cyan-500" />
            {t.metricsGlossaryTitle}
          </span>
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''} ${mutedText}`} />
        </button>

        {open && (
          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              {glossary.map((item) => (
                <div key={item.term}>
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{item.term}</p>
                  <p className={`text-xs leading-relaxed ${mutedText}`}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* How sentiment is decided — mirrors scraper/core/nlp.py _classify */}
            <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-900/40' : 'bg-gray-50'}`}>
              <p className={`font-poppins text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{t.sentimentMathTitle}</p>
              <p className={`text-xs leading-relaxed mb-3 ${mutedText}`}>{t.sentimentMathDesc}</p>
              <ul className={`space-y-1 text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <li>polarity = P({t.positive}) − P({t.negative})</li>
                <li>{t.neutral}: P({t.neutral}) ≥ 0.52 &amp; |polarity| ≤ 0.18</li>
                <li>{t.positive}: polarity ≥ +0.10</li>
                <li>{t.negative}: polarity ≤ −0.10</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
