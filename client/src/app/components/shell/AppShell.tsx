import type { ReactNode } from 'react';
import { useMatches } from 'react-router';
import { NavRail } from './NavRail';
import { RightRail } from './RightRail';
import { BottomTabBar } from './BottomTabBar';
import { TopBar } from './TopBar';

interface RouteHandle {
  hideRightRail?: boolean;
  wide?: boolean;
}

/** X-style three-column shell: NavRail (md+), centre feed column, RightRail
 * (lg+). Mobile gets TopBar + BottomTabBar instead. Routes opt out of the
 * right rail / opt into a wide centre via their route `handle`
 * ({ hideRightRail, wide } — the article page sets both). */
export function AppShell({ children }: { children: ReactNode }) {
  const matches = useMatches();
  const handle = matches.reduce<RouteHandle>((acc, m) => {
    const h = (m.handle ?? {}) as RouteHandle;
    return { hideRightRail: acc.hideRightRail || h.hideRightRail, wide: acc.wide || h.wide };
  }, {});

  return (
    // Full-bleed: NavRail hugs the left edge, RightRail grows to the right
    // edge (flex-1 in RightRail.tsx) — no dead gutters around the shell.
    <div className="flex w-full min-h-screen items-stretch">
      <NavRail />

      <main
        className={`flex-1 min-w-0 w-full md:border-slate-200 dark:md:border-slate-800 ${
          handle.wide
            ? 'max-w-[1050px] mx-auto md:border-x'
            : 'md:border-r' // fills the space between NavRail and RightRail — no gaps
        } pb-16 md:pb-0`}
      >
        <TopBar />
        {children}
      </main>

      {!handle.hideRightRail && <RightRail />}

      <BottomTabBar />
    </div>
  );
}
