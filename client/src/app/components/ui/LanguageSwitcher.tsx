import { Languages, Loader2, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { Language } from '../../i18n/translations';

interface LanguageSwitcherProps {
  isDark: boolean;
  // Surfaced by the consuming page (it owns the translate request lifecycle).
  isLoading?: boolean;
  isAutoTranslated?: boolean;
}

const LANG_PILLS: { code: Language; short: string }[] = [
  { code: 'en', short: 'EN' },
  { code: 'id', short: 'ID' },
  { code: 'zhCN', short: '简中' },
  { code: 'zhTW', short: '繁中' },
];

export function LanguageSwitcher({ isDark, isLoading = false, isAutoTranslated = false }: LanguageSwitcherProps) {
  const { language, setLanguage, translateMode, setTranslateMode, t } = useApp();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Language pills */}
      <div className={`inline-flex items-center gap-1 rounded-full p-1 border ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-white'}`}>
        <Languages size={14} className={`ml-1.5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
        {LANG_PILLS.map((pill) => {
          const active = language === pill.code;
          return (
            <button
              key={pill.code}
              type="button"
              onClick={() => setLanguage(pill.code)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono transition-colors ${
                active
                  ? 'bg-indigo-500 text-white'
                  : isDark
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {pill.short}
            </button>
          );
        })}
      </div>

      {/* Translate-all toggle */}
      <button
        type="button"
        onClick={() => setTranslateMode(!translateMode)}
        aria-pressed={translateMode}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
          translateMode
            ? 'bg-indigo-500 border-indigo-500 text-white'
            : isDark
            ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Languages size={13} />
        {t.translateAll}
      </button>

      {/* Loading spinner during first-time translate */}
      {isLoading && (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <Loader2 size={13} className="animate-spin" />
          {t.translating}
        </span>
      )}

      {/* Auto-translated badge */}
      {!isLoading && isAutoTranslated && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
          <Sparkles size={11} />
          {t.autoTranslated}
        </span>
      )}
    </div>
  );
}
