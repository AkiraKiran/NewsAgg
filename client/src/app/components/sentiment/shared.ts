// Shared styling helpers for the sentiment analytics panels.

export const panelBaseClass = (isDark: boolean): string =>
  isDark
    ? 'bg-slate-800/80 border-slate-700/50 backdrop-blur-md'
    : 'bg-white/80 border-white/60 backdrop-blur-md';

export const chartTextColor = (isDark: boolean): string => (isDark ? '#e2e8f0' : '#374151');

export const chartMutedColor = (isDark: boolean): string => (isDark ? '#64748b' : '#9ca3af');
