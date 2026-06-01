import { createBrowserRouter } from 'react-router';
import { Root } from './pages/Root';
import { Home } from './pages/Home';
import { TopHeadlines } from './pages/TopHeadlines';
import { CountryPage } from './pages/CountryPage';
import { ArticlePage } from './pages/ArticlePage';
import { BookmarksPage } from './pages/BookmarksPage';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'top-headlines', Component: TopHeadlines },
      { path: 'bookmarks', Component: BookmarksPage },
      { path: 'country/:iso', Component: CountryPage },
      { path: 'article/:id', Component: ArticlePage },
      { path: '*', Component: NotFound },
    ],
  },
]);
