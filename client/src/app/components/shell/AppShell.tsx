import type { ReactNode } from 'react';
import { useMatches } from 'react-router';
import { NavRail } from './NavRail';
import { RightRail } from './RightRail';
import { BottomTabBar } from './BottomTabBar';
import { TopBar } from './TopBar';
import { Footer } from './Footer';

interface RouteHandle {
  hideRightRail?: boolean;
  hideFooter?: boolean;
}

/** X-style three-column shell: NavRail (md+), centre feed column, RightRail
 * (lg+). Mobile gets TopBar + BottomTabBar instead. Routes opt out of the
 * right rail / footer via their route `handle` ({ hideRightRail, hideFooter }
 * — the article page hides the rail; infinite-feed pages hide the footer). */
export function AppShell({ children }: { children: ReactNode }) {
  const matches = useMatches();
  const handle = matches.reduce<RouteHandle>((acc, m) => {
    const h = (m.handle ?? {}) as RouteHandle;
    return {
      hideRightRail: acc.hideRightRail || h.hideRightRail,
      hideFooter: acc.hideFooter || h.hideFooter,
    };
  }, {});

  return (
    // Full-bleed: NavRail hugs the left edge, RightRail grows to the right
    // edge (flex-1 in RightRail.tsx) — no dead gutters around the shell.
    <div className="flex w-full min-h-screen items-stretch">
      <NavRail />

      <main
        // md:border-r fills the space between NavRail and RightRail — no gaps
        className="flex-1 min-w-0 w-full md:border-r md:border-slate-200 dark:md:border-slate-800 pb-16 md:pb-0"
      >
        <TopBar />
        {children}
        {!handle.hideFooter && <Footer />}
      </main>

      {!handle.hideRightRail && <RightRail />}

      <BottomTabBar />
    </div>
  );
}
