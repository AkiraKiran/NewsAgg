import { Link } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { POSTS_ENABLED, SOURCES } from '../../constants';

interface FooterLink {
  label: string;
  to: string;
}

/** Compact footer pinned to the bottom of the sticky RightRail (X-style).
 * This is the footer users actually see on the infinite-feed pages (Home,
 * Posts), where a bottom-of-page footer can never be scrolled to. */
export function FooterCompact() {
  const { t, isDark } = useApp();

  return (
    <div
      className={`text-[11px] leading-snug flex flex-col gap-1 ${
        isDark ? 'text-slate-600' : 'text-slate-400'
      }`}
    >
      {/* Static labels until real terms/privacy pages exist — anchors with
       * placeholder hrefs would hijack scroll position when clicked. */}
      <p className="flex flex-wrap items-center gap-x-2">
        <span>{t.termsOfService}</span>
        <span aria-hidden>·</span>
        <span>{t.privacyPolicy}</span>
      </p>
      <p>
        © {new Date().getFullYear()} NewsAgg ·{' '}
        {SOURCES.map((s) => s.name).join(' · ')}
      </p>
    </div>
  );
}

/** Full-width site footer rendered inside <main>, below the page content —
 * but only on routes with finite content (Article, Bookmarks, Profile,
 * Country, 404). Infinite-feed routes (Home, Posts) opt out via
 * `handle.hideFooter`; there the rail's FooterCompact takes over. Four-column
 * responsive grid (1 col mobile → 4 col desktop) + a bottom copyright bar. */
export function Footer() {
  const { t, isDark } = useApp();

  const heading = `font-poppins font-semibold text-sm mb-3 ${
    isDark ? 'text-slate-200' : 'text-slate-800'
  }`;
  const link = `text-sm transition-colors ${
    isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900'
  }`;
  const body = `text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

  const navLinks: FooterLink[] = [
    { label: t.home, to: '/' },
    { label: t.bookmarks, to: '/bookmarks' },
    ...(POSTS_ENABLED ? [{ label: t.posts, to: '/posts' }] : []),
  ];

  return (
    <footer
      className={`mt-8 border-t px-4 md:px-6 py-10 ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Column 1 — Brand */}
        <div>
          <Link to="/" className="flex items-center gap-2">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center font-poppins font-bold text-white text-lg shrink-0"
              style={{ background: 'var(--brand-grad, #06b6d4)' }}
            >
              N
            </span>
            <span
              className={`font-poppins text-xl font-bold ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              NewsAgg
            </span>
          </Link>
          <p className="mt-3 text-sm text-slate-500">{t.footerTagline}</p>
        </div>

        {/* Column 2 — Navigate */}
        <div>
          <h3 className={heading}>{t.navigate}</h3>
          <ul className="flex flex-col gap-2">
            {navLinks.map(({ label, to }) => (
              <li key={to}>
                <Link to={to} className={link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — Sources */}
        <div>
          <h3 className={heading}>{t.newsSources}</h3>
          <ul className="flex flex-col gap-2">
            {SOURCES.map(({ id, name, domain }) => (
              <li key={id}>
                <a
                  href={`https://${domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={link}
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4 — Legal & Info */}
        <div>
          <h3 className={heading}>{t.legalInfo}</h3>
          {/* Static labels until real terms/privacy pages exist — anchors with
           * placeholder hrefs would hijack scroll position when clicked. */}
          <ul className="flex flex-col gap-2">
            <li>
              <span className={body}>{t.termsOfService}</span>
            </li>
            <li>
              <span className={body}>{t.privacyPolicy}</span>
            </li>
          </ul>
          <span
            className="inline-block mt-4 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ color: 'var(--brand, #06b6d4)', background: 'rgba(6, 182, 212, 0.12)' }}
          >
            {t.poweredByNLP}
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className={`mt-10 pt-6 border-t text-[13px] ${
          isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'
        }`}
      >
        © {new Date().getFullYear()} NewsAgg. {t.allRightsReserved}
      </div>
    </footer>
  );
}
