import { createBrowserRouter, redirect } from 'react-router';
import { Root } from './pages/Root';

// Every page is a router-native lazy route, so the initial bundle ships only
// the shell; each page's chunk loads on first navigation.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      {
        index: true,
        // Infinite feed — a bottom-of-page footer is unreachable here; the
        // sticky right rail's FooterCompact serves as the footer instead.
        handle: { hideFooter: true },
        lazy: async () => ({ Component: (await import('./pages/Home')).Home }),
      },
      // Top headlines now live in the Home HeroCarousel; keep stale URLs working.
      { path: 'top-headlines', loader: () => redirect('/') },
      {
        path: 'bookmarks',
        lazy: async () => ({ Component: (await import('./pages/BookmarksPage')).BookmarksPage }),
      },
      {
        path: 'profile',
        lazy: async () => ({ Component: (await import('./pages/ProfilePage')).ProfilePage }),
      },
      {
        path: 'posts',
        // Infinite feed — same reasoning as Home.
        handle: { hideFooter: true },
        lazy: async () => ({ Component: (await import('./pages/PostsPage')).PostsPage }),
      },
      {
        path: 'country/:iso',
        lazy: async () => ({ Component: (await import('./pages/CountryPage')).CountryPage }),
      },
      {
        // Same full-bleed geometry as Home: the article's own sidebar plays
        // the right-rail role (content ≤760px, sidebar grows to the edge).
        path: 'article/:id',
        handle: { hideRightRail: true },
        lazy: async () => ({ Component: (await import('./pages/ArticlePage')).ArticlePage }),
      },
      { path: '*', lazy: async () => ({ Component: (await import('./pages/NotFound')).NotFound }) },
    ],
  },
]);
