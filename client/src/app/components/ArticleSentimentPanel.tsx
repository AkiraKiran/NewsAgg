import { useApp } from '../contexts/AppContext';
import { GradientBarWithPointer } from './ui/GradientBarWithPointer';
import type { NewsArticle } from '../types/article';
import type { SentimentType } from '../types/sentiment';

interface ArticleSentimentPanelProps {
    article: NewsArticle;
    isDark: boolean;
}

const PROBABILITY_STYLE: Record<SentimentType, { bar: string; text: string }> = {
    positive: {
        bar: 'bg-emerald-500',
        text: 'text-emerald-600',
    },
    neutral: {
        bar: 'bg-gray-500',
        text: 'text-gray-600',
    },
    negative: {
        bar: 'bg-red-500',
        text: 'text-red-600',
    },
};

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));

const clampSignedUnit = (value: number): number => Math.max(-1, Math.min(1, value));

export function ArticleSentimentPanel({ article, isDark }: ArticleSentimentPanelProps) {
    const { t } = useApp();

    const panelBase = isDark
        ? 'bg-slate-800/80 border-slate-700/50 backdrop-blur-md'
        : 'bg-white/85 border-white/60 backdrop-blur-md';

    const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
    const trackClass = isDark ? 'bg-slate-700' : 'bg-gray-100';

    const confidence = clampUnit(article.sentiment.score);
    const comparative = clampSignedUnit(article.sentiment.comparative);

    const rawProbabilities = article.sentiment.probabilities;
    const positive = clampUnit(rawProbabilities.positive);
    const neutral = clampUnit(rawProbabilities.neutral);
    const negative = clampUnit(rawProbabilities.negative);
    const total = positive + neutral + negative;

    const probabilities = total > 0
        ? {
            positive: positive / total,
            neutral: neutral / total,
            negative: negative / total,
        }
        : {
            positive: 0,
            neutral: 0,
            negative: 0,
        };

    const rows: Array<{ type: SentimentType; label: string; value: number }> = [
        { type: 'positive', label: t.positive, value: probabilities.positive },
        { type: 'neutral', label: t.neutral, value: probabilities.neutral },
        { type: 'negative', label: t.negative, value: probabilities.negative },
    ];

    return (
        <div className={`rounded-2xl border p-5 ${panelBase}`}>
            <h3 className={`font-poppins text-sm font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                {t.articleSentiment}
            </h3>

            <div className="space-y-2">
                <GradientBarWithPointer
                    value={comparative}
                    label={t[article.sentiment.type]}
                    height={22}
                    pointerSize={18}
                    className="my-1"
                />

                <p className={`text-xs ${mutedText}`}>
                    Confidence: {(confidence * 100).toFixed(1)}%
                </p>
            </div>

            <div className="mt-4 space-y-2.5">
                <p className={`text-xs font-medium ${mutedText}`}>{t.emotionBreakdown}</p>

                {rows.map((row) => (
                    <div key={row.type} className="flex items-center gap-2">
                        <span className={`w-16 text-xs ${mutedText}`}>{row.label}</span>
                        <div className={`h-2 rounded-full overflow-hidden flex-1 ${trackClass}`}>
                            <div
                                className={`h-full rounded-full ${PROBABILITY_STYLE[row.type].bar}`}
                                style={{ width: `${(row.value * 100).toFixed(1)}%` }}
                            />
                        </div>
                        <span className={`w-12 text-right text-xs font-semibold ${PROBABILITY_STYLE[row.type].text}`}>
                            {(row.value * 100).toFixed(1)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
